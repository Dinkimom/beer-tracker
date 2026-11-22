import type { SprintComments } from './sprintComments';
import type { SprintLinks } from './sprintLinks';
import type { CommentHistoryChange } from '@/features/comments/utils/commentHistoryChange';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { TaskPositionsStore } from '@/lib/layers/application/mobx/stores/taskPositionsStore';
import type { Comment, TaskLink, TaskParent } from '@/types';

import { approveCommentDraftsLocally } from '@/features/comments/utils/approveCommentDrafts';
import { applyCommentChangeWithHistory } from '@/features/comments/utils/commentHistoryChange';
import {
  commentCardRowLayoutToPersistPatch,
  parseSwimlaneCommentTaskId,
  toSwimlaneCommentTaskId,
} from '@/features/comments/utils/swimlaneCommentTaskBridge';
import {
  excludeTaskLinksTouchingId,
  persistRetargetedTaskLinks,
  selectTaskLinksTouchingId,
} from '@/features/swimlane/utils/swimlaneLinkingHelpers';
import {
  approveAllPendingSprintComments,
  approveSprintComment,
  rejectAllPendingSprintComments,
} from '@/lib/api/sprints';
import { parseCommentAuthorName } from '@/lib/comments/commentAuthor';

/** Раскладка заметки на дорожке: ячейка, строка и размер. */
type NoteLayoutPatch = Partial<{
  assigneeId: string;
  day: number;
  height: number;
  part: number;
  width: number;
  x: number;
  y: number;
}>;

interface HistoryOptions {
  recordHistory?: boolean;
}

interface SprintNotesDeps {
  comments: SprintComments;
  links: SprintLinks;
  positions: TaskPositionsStore;
  sprintId: number | null;
  savePlannerLink: (link: Pick<TaskLink, 'fromTaskId' | 'id' | 'toTaskId'>) => Promise<void>;
}

function withParent(comment: Comment, parent: TaskParent | null): Comment {
  return parent ? { ...comment, parent } : { ...comment, parent: undefined };
}

function linksTouchingNotes(links: TaskLink[], commentIds: readonly string[]): TaskLink[] {
  const byId = new Map<string, TaskLink>();
  for (const commentId of commentIds) {
    for (const link of selectTaskLinksTouchingId(links, toSwimlaneCommentTaskId(commentId))) {
      byId.set(link.id, link);
    }
  }
  return [...byId.values()];
}

/**
 * Заметки, фото и схемы на доске спринта — правила действий с ними. Правка сразу на доске,
 * запись — через `SyncedList` заметок; что не принял сервер, откатывается.
 *
 * Undo планера пишут только перемещение (`move`), смена родителя (`changeParent`) и атомарный
 * drop на фиче-дорожку (`changePlan`); создание, удаление, текст и цвет, раскладка по строкам,
 * принять/отклонить — без истории.
 */
export class SprintNotes {
  constructor(private readonly deps: SprintNotesDeps) {}

  /** Новая заметка; автор — из заметки или текущего пользователя (`authorDisplay` трекера). */
  readonly create = (comment: Comment, authorDisplay?: string | null): void => {
    const authorName = comment.authorName ?? parseCommentAuthorName(authorDisplay ?? undefined);
    this.deps.comments.setWithSave((prev) => [...prev, authorName ? { ...comment, authorName } : comment]);
  };

  /**
   * Удалить заметку. Стрелки к ней сервер убирает сам (каскад в той же транзакции) — клиент убирает
   * их из списка; при конвертации в задачу (`retargetLinksTo`) стрелки сначала перецепляются на задачу,
   * иначе каскад снёс бы их раньше.
   */
  readonly remove = (id: string, options?: { retargetLinksTo?: string }): Promise<void> => {
    const linksSync = this.syncLinksOnRemove(toSwimlaneCommentTaskId(id), options?.retargetLinksTo);
    this.deps.comments.setWithSave((prev) => prev.filter((comment) => comment.id !== id));
    if (!this.deps.sprintId) {
      return linksSync;
    }
    return linksSync
      .then(() => this.deps.comments.delete(id))
      .catch((error) => {
        console.error('Error deleting comment:', error);
      });
  };

  readonly approve = (id: string): void => {
    this.approveDrafts([id], (sprintId) => approveSprintComment(sprintId, id));
  };

  readonly approveAll = (commentIds: readonly string[]): void => {
    if (commentIds.length > 0) {
      this.approveDrafts(commentIds, approveAllPendingSprintComments);
    }
  };

  /** Отклонить черновики агента вместе с их стрелками; сервер не принял — вернуть. */
  readonly rejectAll = (commentIds: readonly string[]): void => {
    if (commentIds.length === 0) {
      return;
    }
    const { comments, links, sprintId } = this.deps;
    const idSet = new Set(commentIds);
    const linksToDelete = linksTouchingNotes(links.items, commentIds);
    const removed = comments.items.filter((comment) => idSet.has(comment.id));
    comments.setWithSave((prev) => prev.filter((comment) => !idSet.has(comment.id)));
    const linkIds = new Set(linksToDelete.map((link) => link.id));
    if (linkIds.size > 0) {
      links.setWithSave((prev) => prev.filter((link) => !linkIds.has(link.id)));
    }
    if (!sprintId) {
      return;
    }
    for (const link of linksToDelete) {
      links.delete(link.id).catch((error) => {
        console.error('Error deleting link:', error);
      });
    }
    rejectAllPendingSprintComments(sprintId).catch((error) => {
      console.error('Error rejecting pending comments:', error);
      comments.setWithSave((prev) => [...prev, ...removed]);
      if (linkIds.size > 0) {
        links.setWithSave((prev) => [...prev, ...linksToDelete]);
      }
    });
  };

  /** Перемещение в другую ячейку/строку. */
  readonly move = (id: string, patch: NoteLayoutPatch, options?: HistoryOptions): void => {
    this.changeWithHistory(id, (current) => ({ ...current, ...patch }), options?.recordHistory !== false);
    this.touchLane(id);
  };

  readonly changeParent = (id: string, parent: TaskParent | null, options?: HistoryOptions): void => {
    this.changeWithHistory(id, (current) => withParent(current, parent), options?.recordHistory !== false);
  };

  /** Раскладка и, если задан, родитель — одним шагом истории (drop на фиче-дорожку). */
  readonly changePlan = (id: string, patch: NoteLayoutPatch, parentChange: TaskParent | null | undefined): void => {
    this.changeWithHistory(
      id,
      (current) => {
        const next: Comment = { ...current, ...patch };
        return parentChange === undefined ? next : withParent(next, parentChange);
      },
      true
    );
    this.touchLane(id);
  };

  readonly updateText = (id: string, text: string, color?: StickyNoteColor): void => {
    this.patch(id, { text, ...(color != null ? { color } : {}) });
  };

  /** Цвет из реакции на заметку; id — дорожки (`comment:…`). */
  readonly paintColor = (noteTaskId: string, color: StickyNoteColor): void => {
    const id = parseSwimlaneCommentTaskId(noteTaskId);
    if (id != null) {
      this.patch(id, { color });
    }
  };

  /** Высота в строках карточек; растянутая заметка стоит, мешающие соседи сдвигаются вниз. */
  readonly setCardRowLayout = (id: string, layout: { layerShiftUp: number; span: number }): void => {
    const { height, y } = commentCardRowLayoutToPersistPatch(layout);
    this.patch(id, { height, y });
    this.touchLane(id);
  };

  /** Заметки переехали в другой спринт — с этой доски уходят без удаления на сервере. */
  readonly leftSprint = (commentIds: readonly string[]): void => {
    if (commentIds.length === 0) {
      return;
    }
    const leaving = new Set(commentIds);
    this.deps.comments.setWithSave((prev) => prev.filter((comment) => !leaving.has(comment.id)));
  };

  private patch(id: string, fields: Partial<Comment>): void {
    this.deps.comments.setWithSave((prev) =>
      prev.map((comment) => (comment.id === id ? { ...comment, ...fields } : comment))
    );
  }

  private changeWithHistory(id: string, change: (current: Comment) => Comment, record: boolean): void {
    let history: CommentHistoryChange | null = null;
    this.deps.comments.setWithSave((prev) => {
      const result = applyCommentChangeWithHistory(prev, id, change);
      history = result.history;
      return result.comments;
    });
    if (record && history) {
      this.deps.positions.recordPlanHistory({
        after: new Map(),
        before: new Map(),
        comments: new Map([[id, history]]),
      });
    }
  }

  private touchLane(id: string): void {
    this.deps.positions.laneLayers.touch(toSwimlaneCommentTaskId(id));
  }

  /** Принять черновики сразу на доске; сервер не принял — вернуть, как было до нажатия. */
  private approveDrafts(commentIds: readonly string[], request: (sprintId: number) => Promise<boolean>): void {
    const { comments, sprintId } = this.deps;
    const before = comments.items;
    comments.setWithSave((prev) => approveCommentDraftsLocally(prev, new Set(commentIds)));
    if (!sprintId) {
      return;
    }
    const revert = () => comments.setWithSave(() => before);
    request(sprintId)
      .then((ok) => {
        if (!ok) {
          revert();
        }
      })
      .catch((error) => {
        console.error('Error approving agent drafts:', error);
        revert();
      });
  }

  private syncLinksOnRemove(commentTaskId: string, retargetLinksTo: string | undefined): Promise<void> {
    const { links, savePlannerLink } = this.deps;
    if (retargetLinksTo) {
      return persistRetargetedTaskLinks({
        deleteLink: links.delete,
        fromTaskId: commentTaskId,
        saveLink: savePlannerLink,
        setTaskLinks: links.setWithSave,
        taskLinks: links.items,
        toTaskId: retargetLinksTo,
      });
    }
    links.setWithSave((prev) => excludeTaskLinksTouchingId(prev, commentTaskId));
    return Promise.resolve();
  }
}
