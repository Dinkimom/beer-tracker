/**
 * Хуки для работы с данными через API вместо localStorage
 * (общие для пользователей спринта, не локальный storage).
 *
 * Два паттерна отложенной записи — см. **«Списки и документы с отложенной записью»** в [ARCHITECTURE.md](../ARCHITECTURE.md):
 * - **SyncedList** — списки сущностей (связи, заметки) живут в модели доски (`features/sprint/model/`).
 * - **useFeatureLanesApi** — один JSON-документ на спринт; отдельная реализация, не generic-список.
 */

import type { FeatureLanesDocument } from '@/lib/sprints/featureLanesDocument';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { isValidSprintId } from '@/lib/layers/data/mappers/taskPositionToApi';

import {
  ensureFeatureLanesSessionLoaded,
  getFeatureLanesSession,
  getFeatureLanesSessionLoaded,
  patchFeatureLanesSession,
  subscribeFeatureLanesSession,
} from './featureLanesSessionStore';

// ==================== Хук порядка занятости ====================

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
