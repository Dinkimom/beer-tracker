/**
 * Хуки для работы с данными через API вместо localStorage
 * (общие для пользователей спринта, не локальный storage).
 *
 * Два паттерна отложенной записи — см. **«Локальный стейт + API»** в [ARCHITECTURE.md](../ARCHITECTURE.md):
 * - **useDebouncedApiSync** — списки (связи, комментарии) через `useTaskLinksApi` / `useCommentsApi`.
 * - **useOccupancyTaskOrderApi** / **useFeatureLanesApi** — один JSON-документ на спринт; отдельная реализация, не generic-список.
 */

import type { FeatureLanesDocument } from '@/lib/sprints/featureLanesDocument';
import type { Comment, TaskLink } from '@/types';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { commentToSaveApiFields } from '@/lib/api/sprintsApiCommentsHelpers';
import {
  type OccupancyTaskOrder,
  fetchOccupancyTaskOrder,
  saveOccupancyTaskOrder,
  fetchSprintLinks,
  saveTaskLink,
  saveTaskLinksBatch,
  deleteTaskLink,
  fetchSprintComments,
  saveComment as apiSaveComment,
  deleteComment as apiDeleteComment,
} from '@/lib/beerTrackerApi';
import { isValidSprintId } from '@/lib/layers/data/mappers/taskPositionToApi';
import {
  getInflightSprintBoardList,
  takePrefetchedSprintBoardList,
} from '@/lib/sprints/sprintBoardListPrefetch';
import { DELAYS } from '@/utils/constants';

import {
  ensureFeatureLanesSessionLoaded,
  getFeatureLanesSession,
  getFeatureLanesSessionLoaded,
  patchFeatureLanesSession,
  subscribeFeatureLanesSession,
} from './featureLanesSessionStore';
import { useDebouncedApiSync } from './useDebouncedApiSync';

function takePrefetchedSprintLinks(sprintId: number): TaskLink[] | undefined {
  return takePrefetchedSprintBoardList(sprintId, 'links');
}

function getInflightSprintLinks(sprintId: number): Promise<TaskLink[]> | undefined {
  return getInflightSprintBoardList(sprintId, 'links');
}

function takePrefetchedSprintComments(sprintId: number): Comment[] | undefined {
  return takePrefetchedSprintBoardList(sprintId, 'comments');
}

function getInflightSprintComments(sprintId: number): Promise<Comment[]> | undefined {
  return getInflightSprintBoardList(sprintId, 'comments');
}

// ==================== Хуки для связей ====================

/**
 * Хук для работы со связями задач через API
 */
export function useTaskLinksApi(
  sprintId: number | null
): [
  TaskLink[],
  (links: TaskLink[] | ((prev: TaskLink[]) => TaskLink[])) => void,
  (link: TaskLink) => Promise<void>,
  (linkId: string) => Promise<void>,
  () => Promise<void>,
] {
  const [links, setLinksWithSave, saveLink, deleteLink, reloadFromRemote] = useDebouncedApiSync<TaskLink, string, {
    id: string;
    fromTaskId: string;
    toTaskId: string;
    fromAnchor: string | null;
    toAnchor: string | null;
  }>({
    sprintId,
    fetchFn: fetchSprintLinks,
    saveFn: (sprintId, data) => saveTaskLink(sprintId, data),
    batchSaveFn: (sprintId, items) => saveTaskLinksBatch(sprintId, items),
    deleteFn: deleteTaskLink,
    getId: (link) => link.id,
    getInitialItems: takePrefetchedSprintLinks,
    getInflightItems: getInflightSprintLinks,
    toApiFormat: (link) => ({
      id: link.id,
      fromTaskId: link.fromTaskId,
      toTaskId: link.toTaskId,
      fromAnchor: link.fromAnchor || null,
      toAnchor: link.toAnchor || null,
    }),
  });

  return [links, setLinksWithSave, saveLink, deleteLink, reloadFromRemote];
}

// ==================== Хуки для комментариев ====================

/**
 * Хук для работы с комментариями через API
 */
export function useCommentsApi(
  sprintId: number | null
): [
  Comment[],
  (comments: Comment[] | ((prev: Comment[]) => Comment[])) => void,
  (comment: Comment) => Promise<void>,
  (commentId: string) => Promise<void>,
  () => Promise<void>,
] {
  const { t } = useI18n();
  const [comments, setCommentsWithSave, saveCommentLocal, deleteCommentLocal, reloadFromRemote] = useDebouncedApiSync<Comment, string, {
    id: string;
    assigneeId: string;
    color?: string;
    imageFileId: string | null;
    kind?: 'diagram' | 'image' | 'text';
    parent?: Comment['parent'] | null;
    text: string;
    x: number | null;
    y: number | null;
    day: number | null;
    part: number | null;
    skipMentionNotifications?: boolean;
    width: number;
    height: number;
  }>({
    sprintId,
    debounceDelay: 600,
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
    mergeRemotePendingItem: (pending, remote) => ({
      ...pending,
      reactions: remote.reactions ?? pending.reactions,
    }),
    fetchFn: fetchSprintComments,
    saveFn: async (sprintIdArg, data, isUpdate = false) => {
      try {
        return await apiSaveComment(sprintIdArg, {
          id: data.id,
          assigneeId: data.assigneeId,
          color: data.color,
          imageFileId: data.imageFileId,
          kind: data.kind,
          parent: data.parent,
          text: data.text,
          x: data.x,
          y: data.y,
          day: data.day,
          part: data.part,
          skipMentionNotifications: data.skipMentionNotifications,
          width: data.width,
          height: data.height,
        }, isUpdate);
      } catch (error) {
        toast.error(t('sprintPlanner.swimlane.quickAddMenu.createCommentFailed'));
        throw error;
      }
    },
    deleteFn: apiDeleteComment,
    getId: (comment) => comment.id,
    getInitialItems: takePrefetchedSprintComments,
    getInflightItems: getInflightSprintComments,
    toApiFormat: (comment, isUpdate) =>
      commentToSaveApiFields({
        id: isUpdate && comment.id ? comment.id : comment.id ?? '',
        assigneeId: comment.assigneeId,
        color: comment.color,
        imageFileId: comment.imageFileId ?? null,
        kind: comment.kind,
        parent: comment.parent ?? null,
        skipMentionNotifications: comment.skipMentionNotifications,
        text: comment.text,
        x: comment.x,
        y: comment.y,
        day: comment.day,
        part: comment.part,
        width: comment.width,
        height: comment.height,
      }),
  });

  return [comments, setCommentsWithSave, saveCommentLocal, deleteCommentLocal, reloadFromRemote];
}

// ==================== Хук порядка занятости ====================

/**
 * Порядок строк «Занятость» на спринт: один документ в API, дебаунс сохранения.
 * Не использовать `useDebouncedApiSync` — там модель «массив элементов + save/delete по id».
 */
export function useOccupancyTaskOrderApi(sprintId: number | null): [
  OccupancyTaskOrder | undefined,
  (updater: (prev: OccupancyTaskOrder | undefined) => OccupancyTaskOrder) => void
] {
  const [taskOrder, setTaskOrderState] = useState<OccupancyTaskOrder | undefined>(undefined);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingOrderRef = useRef<OccupancyTaskOrder | null>(null);

  // Загрузка при изменении спринта
  useEffect(() => {
    if (!isValidSprintId(sprintId)) {
      queueMicrotask(() => setTaskOrderState(undefined));
      return;
    }

    let cancelled = false;
    fetchOccupancyTaskOrder(sprintId!)
      .then((order) => {
        if (!cancelled) {
          setTaskOrderState(order ?? undefined);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Error loading occupancy task order:', error);
          setTaskOrderState(undefined);
        }
      });

    return () => {
      cancelled = true;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [sprintId]);

  const setTaskOrder = (updater: (prev: OccupancyTaskOrder | undefined) => OccupancyTaskOrder) => {
    if (!isValidSprintId(sprintId)) return;

    setTaskOrderState((prev) => {
      const next = updater(prev);
      pendingOrderRef.current = next;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        saveTimerRef.current = null;
        const toSave = pendingOrderRef.current;
        if (toSave && isValidSprintId(sprintId)) {
          try {
            await saveOccupancyTaskOrder(sprintId!, toSave);
          } catch (error) {
            console.error('Error saving occupancy task order:', error);
          }
        }
      }, DELAYS.DEBOUNCE);

      return next;
    });
  };

  return [taskOrder, setTaskOrder];
}

/**
 * Черновые строки фич и порядок/видимость доски «по фичам»: один документ, дебаунс сохранения.
 * Состояние общее на спринт: drop в «Без родителя» должен сразу снять overlay, а не ждать reload.
 */
export function useFeatureLanesApi(sprintId: number | null): [
  FeatureLanesDocument | undefined,
  (updater: (prev: FeatureLanesDocument | undefined) => FeatureLanesDocument) => void,
  boolean
] {
  const sprintKey = isValidSprintId(sprintId) ? sprintId : null;
  const subscribeLanes = useCallback(
    (onStoreChange: () => void) => {
      if (sprintKey == null) {
        return () => undefined;
      }
      return subscribeFeatureLanesSession(sprintKey, onStoreChange);
    },
    [sprintKey]
  );
  const lanes = useSyncExternalStore(
    subscribeLanes,
    () => (sprintKey == null ? undefined : getFeatureLanesSession(sprintKey)),
    () => undefined
  );
  const lanesLoaded = useSyncExternalStore(
    subscribeLanes,
    () => (sprintKey == null ? true : getFeatureLanesSessionLoaded(sprintKey)),
    () => false
  );

  useEffect(() => {
    if (sprintKey == null) {
      return;
    }
    ensureFeatureLanesSessionLoaded(sprintKey);
  }, [sprintKey]);

  const setLanes = useCallback(
    (updater: (prev: FeatureLanesDocument | undefined) => FeatureLanesDocument) => {
      if (sprintKey == null) {
        return;
      }
      patchFeatureLanesSession(sprintKey, updater);
    },
    [sprintKey]
  );

  return [lanes, setLanes, lanesLoaded];
}

export type { GetTaskInfoFn } from './useTaskPositionsApi';
export { useTaskPositionsApi } from './useTaskPositionsApi';
