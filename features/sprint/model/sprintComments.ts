import type { CommentSaveSerializer } from '@/lib/comments/commentSaveSerializer';
import type { Comment } from '@/types';

import {
  commentToSaveApiFields,
  SprintCommentVersionConflictError,
} from '@/lib/api/sprintsApiCommentsHelpers';
import {
  deleteComment as apiDeleteComment,
  fetchSprintComments,
  saveComment as apiSaveComment,
} from '@/lib/beerTrackerApi';
import { createCommentSaveSerializer } from '@/lib/comments/commentSaveSerializer';
import { SyncedList } from '@/lib/layers/application/mobx/syncedList';
import { randomUuid } from '@/lib/randomUuid';
import { prefetchSprintBoardList, takePrefetchedSprintBoardList } from '@/lib/sprints/sprintBoardListPrefetch';

type CommentSaveApiData = Parameters<typeof apiSaveComment>[1] & { id: string };

/** Сообщения пользователю — с переводом из React; модель их только вызывает. */
export interface SprintCommentsNotify {
  conflict: () => void;
  failure: () => void;
}

export type SprintComments = SyncedList<Comment, string, CommentSaveApiData>;

/**
 * Сохранение заметки по очереди своих сохранений: `ifVersion` продвигается собственными успешными
 * PUT, 409 (параллельная правка) — `onConflict` и «обработано», чтобы синк не повторял устаревшую правку.
 */
function saveCommentSerialized(input: {
  data: CommentSaveApiData;
  isUpdate: boolean;
  onConflict: () => void;
  onFailure: () => void;
  serializer: CommentSaveSerializer;
  sprintId: number;
}): Promise<Comment | boolean> {
  const { data, isUpdate, serializer } = input;
  return serializer.run(data.id || `new:${randomUuid()}`, async () => {
    const ifVersion = isUpdate ? serializer.resolveIfVersion(data.id, data.ifVersion) : undefined;
    try {
      const saved = await apiSaveComment(input.sprintId, { ...data, ifVersion }, isUpdate);
      if (isUpdate && typeof saved === 'object' && saved.id === data.id) {
        // Не подменяем локальную копию ответом: пока PUT был в полёте, текст могли дописать.
        serializer.recordSaved(data.id, ifVersion, saved.version);
        return true;
      }
      return saved;
    } catch (error) {
      if (error instanceof SprintCommentVersionConflictError) {
        input.onConflict();
        return true;
      }
      input.onFailure();
      throw error;
    }
  });
}

/**
 * Заметки спринта: правки сразу, запись — после паузы, по очереди своих сохранений с версиями.
 * При конфликте правок — сообщение и перечитать список.
 */
export function createSprintComments(
  sprintId: number | null,
  notify: { readonly current: SprintCommentsNotify }
): SprintComments {
  const serializer = createCommentSaveSerializer();
  const comments: SprintComments = new SyncedList<Comment, string, CommentSaveApiData>(sprintId, {
    debounceDelay: 600,
    deleteFn: apiDeleteComment,
    fetchFn: fetchSprintComments,
    getId: (comment) => comment.id,
    getInitialItems: (id) => takePrefetchedSprintBoardList(id, 'comments'),
    loadSharedItems: (id) => prefetchSprintBoardList(id, 'comments', fetchSprintComments),
    mergeRemotePendingItem: (pending, remote) => ({
      ...pending,
      reactions: remote.reactions ?? pending.reactions,
    }),
    mergeSavedItem: (previous, saved) => ({
      ...saved,
      authorName: saved.authorName ?? previous.authorName,
      clientInstanceId: previous.clientInstanceId,
      imageFileId: saved.imageFileId ?? previous.imageFileId,
      imageUrl: saved.imageUrl ?? previous.imageUrl,
      kind: saved.kind ?? previous.kind,
      parent: saved.parent ?? previous.parent,
      reactions: saved.reactions ?? previous.reactions,
    }),
    saveFn: (id, data, isUpdate = false) =>
      saveCommentSerialized({
        data,
        isUpdate,
        onConflict: () => {
          notify.current.conflict();
          comments.reloadFromRemote().catch(() => undefined);
        },
        onFailure: () => notify.current.failure(),
        serializer,
        sprintId: id,
      }),
    toApiFormat: (comment, isUpdate) =>
      commentToSaveApiFields({
        id: isUpdate && comment.id ? comment.id : comment.id ?? '',
        ...(isUpdate && comment.version != null ? { ifVersion: comment.version } : {}),
        assigneeId: comment.assigneeId,
        color: comment.color,
        day: comment.day,
        height: comment.height,
        imageFileId: comment.imageFileId ?? null,
        kind: comment.kind,
        parent: comment.parent ?? null,
        part: comment.part,
        skipMentionNotifications: comment.skipMentionNotifications,
        text: comment.text,
        width: comment.width,
        x: comment.x,
        y: comment.y,
      }),
  });
  return comments;
}
