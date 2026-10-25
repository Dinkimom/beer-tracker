/**
 * Хук для обработчиков комментариев в SprintPlanner
 */

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { Comment as CommentType, TaskParent } from '@/types';

import { useCallback } from 'react';

import { approveCommentDraftsLocally } from '@/features/comments/utils/approveCommentDrafts';
import {
  applyCommentChangeWithHistory,
  type CommentHistoryChange,
} from '@/features/comments/utils/commentHistoryChange';
import {
  playStickyNoteExit,
  shouldAnimateStickyNoteDelete,
} from '@/features/comments/utils/stickyNoteExit';
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
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  approveAllPendingSprintComments,
  approveSprintComment,
  rejectAllPendingSprintComments,
} from '@/lib/api/sprints';
import { parseCommentAuthorName } from '@/lib/comments/commentAuthor';
import { useRootStore } from '@/lib/layers';

interface UseSprintPlannerCommentHandlersProps {
  comments: CommentType[];
  selectedSprintId: number | null;
  taskLinks: Array<{ fromTaskId: string; id: string; toTaskId: string }>;
  deleteComment: (commentId: string) => Promise<void>;
  deleteLink: (linkId: string) => Promise<void>;
  saveLink: (link: { fromTaskId: string; id: string; toTaskId: string }) => Promise<void>;
  setComments: (updater: (prev: CommentType[]) => CommentType[]) => void;
  setTaskLinks: (
    updater: (
      prev: Array<{ fromTaskId: string; id: string; toTaskId: string }>
    ) => Array<{ fromTaskId: string; id: string; toTaskId: string }>
  ) => void;
}

interface CommentHistoryRecordOptions {
  recordHistory?: boolean;
}

/**
 * Undo планера для заметок: шаг пишут только перемещение (`handleCommentMove`), смена родителя
 * (`handleCommentParentChange`) и атомарный drop на фиче-дорожку (`handleCommentPlanChange`).
 * Создание, удаление, текст/цвет, ресайз и вертикальная раскладка, принять/отклонить — без истории.
 */
function recordCommentHistory(
  positionsStore: Pick<ReturnType<typeof useRootStore>['taskPositions'], 'recordPlanHistory'>,
  commentId: string,
  history: CommentHistoryChange
): void {
  positionsStore.recordPlanHistory({
    after: new Map(),
    before: new Map(),
    comments: new Map([[commentId, history]]),
  });
}

function applyParentToComment(comment: CommentType, parent: TaskParent | null): CommentType {
  if (!parent) {
    return { ...comment, parent: undefined };
  }
  return { ...comment, parent };
}

function collectLinksTouchingCommentIds(
  taskLinks: Array<{ fromTaskId: string; id: string; toTaskId: string }>,
  commentIds: readonly string[]
): Array<{ fromTaskId: string; id: string; toTaskId: string }> {
  const byId = new Map<string, { fromTaskId: string; id: string; toTaskId: string }>();
  for (const commentId of commentIds) {
    for (const link of selectTaskLinksTouchingId(taskLinks, toSwimlaneCommentTaskId(commentId))) {
      byId.set(link.id, link);
    }
  }
  return [...byId.values()];
}

/**
 * Стрелки к удалённой заметке сервер убирает сам (DELETE comment → task_links в той же транзакции);
 * клиенту остаётся убрать их из локального списка. При конвертации заметки в задачу стрелки
 * сначала перецепляются на новую задачу.
 */
function syncLinksOnCommentDelete(input: {
  commentTaskId: string;
  retargetLinksTo?: string;
  taskLinks: Array<{ fromTaskId: string; id: string; toTaskId: string }>;
  deleteLink: (linkId: string) => Promise<void>;
  saveLink: (link: { fromTaskId: string; id: string; toTaskId: string }) => Promise<void>;
  setTaskLinks: (
    updater: (
      prev: Array<{ fromTaskId: string; id: string; toTaskId: string }>
    ) => Array<{ fromTaskId: string; id: string; toTaskId: string }>
  ) => void;
}): Promise<void> {
  if (input.retargetLinksTo) {
    return persistRetargetedTaskLinks({
      deleteLink: input.deleteLink,
      fromTaskId: input.commentTaskId,
      saveLink: input.saveLink,
      setTaskLinks: input.setTaskLinks,
      taskLinks: input.taskLinks,
      toTaskId: input.retargetLinksTo,
    });
  }
  input.setTaskLinks((prev) => excludeTaskLinksTouchingId(prev, input.commentTaskId));
  return Promise.resolve();
}

export function useSprintPlannerCommentHandlers({
  comments,
  deleteComment,
  deleteLink,
  saveLink,
  selectedSprintId,
  setComments,
  setTaskLinks,
  taskLinks,
}: UseSprintPlannerCommentHandlersProps) {
  const { data: currentUser } = useCurrentUser();
  const { taskPositions: positionsStore } = useRootStore();

  const handleCommentCreate = useCallback(
    (comment: CommentType) => {
      const authorName = comment.authorName ?? parseCommentAuthorName(currentUser?.display);
      setComments((prev: CommentType[]) => [
        ...prev,
        authorName ? { ...comment, authorName } : comment,
      ]);
    },
    [currentUser?.display, setComments]
  );

  const handleCommentDelete = useCallback(
    (id: string, options?: { retargetLinksTo?: string }) => {
      const remove = () => {
        const linksSync = syncLinksOnCommentDelete({
          commentTaskId: toSwimlaneCommentTaskId(id),
          deleteLink,
          retargetLinksTo: options?.retargetLinksTo,
          saveLink,
          setTaskLinks,
          taskLinks,
        });
        setComments((prev: CommentType[]) => prev.filter((c: CommentType) => c.id !== id));
        if (!selectedSprintId) {
          return linksSync;
        }
        // Перецепка идёт до удаления: иначе серверный каскад снёс бы стрелки раньше клиента.
        return linksSync
          .then(() => deleteComment(id))
          .catch((error) => {
            console.error('Error deleting comment:', error);
          });
      };
      const comment = comments.find((item) => item.id === id);
      if (!shouldAnimateStickyNoteDelete(comment, options?.retargetLinksTo)) {
        return remove();
      }
      playStickyNoteExit(toSwimlaneCommentTaskId(id), remove);
      return undefined;
    },
    [
      comments,
      deleteComment,
      deleteLink,
      saveLink,
      selectedSprintId,
      setComments,
      setTaskLinks,
      taskLinks,
    ]
  );

  /** Принять черновики сразу на доске; сервер не принял — вернуть, как было до нажатия. */
  const approveDrafts = useCallback(
    (commentIds: readonly string[], request: (sprintId: number) => Promise<boolean>) => {
      let before: CommentType[] | null = null;
      setComments((prev: CommentType[]) => {
        before = prev;
        return approveCommentDraftsLocally(prev, new Set(commentIds));
      });
      if (!selectedSprintId) {
        return;
      }
      const revert = () => {
        const snapshot = before;
        if (snapshot) {
          setComments(() => snapshot);
        }
      };
      request(selectedSprintId)
        .then((ok) => {
          if (!ok) {
            revert();
          }
        })
        .catch((error) => {
          console.error('Error approving agent drafts:', error);
          revert();
        });
    },
    [selectedSprintId, setComments]
  );

  const handleCommentApprove = useCallback(
    (id: string) => approveDrafts([id], (sprintId) => approveSprintComment(sprintId, id)),
    [approveDrafts]
  );

  const handleCommentApproveAll = useCallback(
    (commentIds: readonly string[]) => {
      if (commentIds.length > 0) {
        approveDrafts(commentIds, approveAllPendingSprintComments);
      }
    },
    [approveDrafts]
  );

  const handleCommentRejectAll = useCallback(
    (commentIds: readonly string[]) => {
      if (commentIds.length === 0) {
        return;
      }
      const idSet = new Set(commentIds);
      const linksToDelete = collectLinksTouchingCommentIds(taskLinks, commentIds);
      let removed: CommentType[] = [];
      setComments((prev: CommentType[]) => {
        removed = prev.filter((comment) => idSet.has(comment.id));
        return prev.filter((comment) => !idSet.has(comment.id));
      });
      if (linksToDelete.length > 0) {
        const linkIds = new Set(linksToDelete.map((link) => link.id));
        setTaskLinks((prev) => prev.filter((link) => !linkIds.has(link.id)));
      }
      if (!selectedSprintId) {
        return;
      }
      for (const link of linksToDelete) {
        deleteLink(link.id).catch((error) => {
          console.error('Error deleting link:', error);
        });
      }
      rejectAllPendingSprintComments(selectedSprintId).catch((error) => {
        console.error('Error rejecting pending comments:', error);
        setComments((prev: CommentType[]) => [...prev, ...removed]);
        if (linksToDelete.length > 0) {
          setTaskLinks((prev) => [...prev, ...linksToDelete]);
        }
      });
    },
    [deleteLink, selectedSprintId, setComments, setTaskLinks, taskLinks]
  );

  const handleCommentPositionUpdate = useCallback(
    (id: string, x: number, y: number, assigneeId?: string) => {
      setComments((prev: CommentType[]) =>
        prev.map((c: CommentType) => (c.id === id ? { ...c, x, y, ...(assigneeId && { assigneeId }) } : c))
      );
    },
    [setComments]
  );

  /** Перемещение заметки в другую ячейку/строку (day, part, assigneeId, x, y) */
  const handleCommentMove = useCallback(
    (
      id: string,
      payload: Partial<{
        assigneeId: string;
        day: number;
        height: number;
        part: number;
        width: number;
        x: number;
        y: number;
      }>,
      options?: CommentHistoryRecordOptions
    ) => {
      let history = null as CommentHistoryChange | null;
      setComments((prev: CommentType[]) => {
        const result = applyCommentChangeWithHistory(prev, id, (current) => ({ ...current, ...payload }));
        history = result.history;
        return result.comments;
      });
      if (options?.recordHistory !== false && history) {
        recordCommentHistory(positionsStore, id, history);
      }
      positionsStore.laneLayers.touch(toSwimlaneCommentTaskId(id));
    },
    [positionsStore, setComments]
  );

  const handleCommentParentChange = useCallback(
    (commentId: string, parent: TaskParent | null, options?: CommentHistoryRecordOptions) => {
      let history = null as CommentHistoryChange | null;
      setComments((prev: CommentType[]) => {
        const result = applyCommentChangeWithHistory(prev, commentId, (current) =>
          applyParentToComment(current, parent)
        );
        history = result.history;
        return result.comments;
      });
      if (options?.recordHistory !== false && history) {
        recordCommentHistory(positionsStore, commentId, history);
      }
    },
    [positionsStore, setComments]
  );

  /** Atomic layout + optional parent change (feature-lane comment drop). */
  const handleCommentPlanChange = useCallback(
    (
      commentId: string,
      patch: Partial<{
        assigneeId: string;
        day: number;
        height: number;
        part: number;
        width: number;
        x: number;
        y: number;
      }>,
      parentChange: TaskParent | null | undefined
    ) => {
      let history = null as CommentHistoryChange | null;
      setComments((prev: CommentType[]) => {
        const result = applyCommentChangeWithHistory(prev, commentId, (current) => {
          const next: CommentType = { ...current, ...patch };
          return parentChange === undefined ? next : applyParentToComment(next, parentChange);
        });
        history = result.history;
        return result.comments;
      });
      if (history) {
        recordCommentHistory(positionsStore, commentId, history);
      }
      positionsStore.laneLayers.touch(toSwimlaneCommentTaskId(commentId));
    },
    [positionsStore, setComments]
  );

  const handleCommentUpdate = useCallback(
    (id: string, text: string, color?: StickyNoteColor) => {
      setComments((prev: CommentType[]) =>
        prev.map((c: CommentType) =>
          c.id === id ? { ...c, text, ...(color != null ? { color: color } : {}) } : c
        )
      );
    },
    [setComments]
  );

  const handlePaintNoteColorFromReaction = useCallback(
    (noteId: string, color: StickyNoteColor) => {
      const commentId = parseSwimlaneCommentTaskId(noteId);
      if (commentId == null) {
        return;
      }
      setComments((prev: CommentType[]) =>
        prev.map((c: CommentType) => (c.id === commentId ? { ...c, color } : c))
      );
    },
    [setComments]
  );

  const handleCommentSizeUpdate = useCallback(
    (id: string, width: number, height: number) => {
      setComments((prev: CommentType[]) =>
        prev.map((c: CommentType) => (c.id === id ? { ...c, width, height } : c))
      );
      positionsStore.laneLayers.touch(toSwimlaneCommentTaskId(id));
    },
    [positionsStore, setComments]
  );

  const handleCommentCardRowLayoutUpdate = useCallback(
    (id: string, layout: { layerShiftUp: number; span: number }) => {
      const patch = commentCardRowLayoutToPersistPatch(layout);
      setComments((prev: CommentType[]) =>
        prev.map((c: CommentType) =>
          c.id === id ? { ...c, height: patch.height, y: patch.y } : c
        )
      );
      // Растянутая заметка остаётся на месте, мешающие соседи сдвигаются вниз.
      positionsStore.laneLayers.touch(toSwimlaneCommentTaskId(id));
    },
    [positionsStore, setComments]
  );

  const handleCommentsLeftSprint = useCallback((commentIds: string[]) => {
    if (commentIds.length === 0) {
      return;
    }
    const leaving = new Set(commentIds);
    setComments((prev: CommentType[]) =>
      prev.filter((comment: CommentType) => !leaving.has(comment.id))
    );
  }, [setComments]);

  return {
    handleCommentApprove,
    handleCommentApproveAll,
    handleCommentCreate,
    handleCommentDelete,
    handleCommentsLeftSprint,
    handleCommentParentChange,
    handleCommentPlanChange,
    handleCommentMove,
    handleCommentPositionUpdate,
    handleCommentCardRowLayoutUpdate,
    handleCommentRejectAll,
    handleCommentSizeUpdate,
    handlePaintNoteColorFromReaction,
    handleCommentUpdate,
  };
}
