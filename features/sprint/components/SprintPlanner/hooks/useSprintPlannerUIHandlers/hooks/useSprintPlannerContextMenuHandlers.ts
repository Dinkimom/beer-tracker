/**
 * Хук для обработчиков контекстного меню в SprintPlanner
 */

import type { Task, TaskParent } from '@/types';

import { useCallback } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { isFeatureLaneDraftParent } from '@/features/swimlane/utils/featureSwimlaneRows';
import { useFeatureLanesApi } from '@/hooks/useApiStorage';
import { updateIssueParent } from '@/lib/api/issues';
import {
  emptyFeatureLanesDocument,
  setFeatureLaneDraftIssueParent,
} from '@/lib/sprints/featureLanesDocument';

interface UseSprintPlannerContextMenuHandlersParams {
  selectedSprintId: number | null;
  onParentLayoutChanged?: () => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}

export function applyLocalParentToTasks(
  tasks: Task[],
  taskId: string,
  parent: TaskParent | null
): { next: Task[]; previous: TaskParent | undefined } {
  let previous: TaskParent | undefined;
  let captured = false;
  const next = tasks.map((task) => {
    if (task.id !== taskId && task.originalTaskId !== taskId) {
      return task;
    }
    if (!captured) {
      previous = task.parent;
      captured = true;
    }
    if (!parent) {
      return { ...task, parent: undefined };
    }
    return {
      ...task,
      parent: {
        display: parent.display,
        id: parent.id,
        key: parent.key,
        self: parent.self,
      },
    };
  });
  return { next, previous };
}

function isTrackerFeatureParent(parent: TaskParent | null | undefined): parent is TaskParent {
  return parent != null && !isFeatureLaneDraftParent(parent);
}

/**
 * Ключ родителя для Tracker после смены строки фичи.
 * `undefined` — в Tracker ходить не нужно (оба конца локальные: драфт / без родителя).
 */
export function trackerParentKeyAfterPlannerChange(
  previous: TaskParent | undefined,
  next: TaskParent | null
): string | null | undefined {
  const nextIsTracker = isTrackerFeatureParent(next);
  const previousIsTracker = isTrackerFeatureParent(previous);
  if (!nextIsTracker && !previousIsTracker) {
    return undefined;
  }
  return nextIsTracker ? next.key : null;
}

function applyLocalTaskParent(
  setTasks: (updater: (prev: Task[]) => Task[]) => void,
  taskId: string,
  parent: TaskParent | null
): TaskParent | undefined {
  let previous: TaskParent | undefined;
  setTasks((prev) => {
    const applied = applyLocalParentToTasks(prev, taskId, parent);
    previous = applied.previous;
    return applied.next;
  });
  return previous;
}

export function useSprintPlannerContextMenuHandlers({
  onParentLayoutChanged,
  selectedSprintId,
  setTasks,
}: UseSprintPlannerContextMenuHandlersParams) {
  const { t } = useI18n();
  const [, setFeatureLanes] = useFeatureLanesApi(selectedSprintId);

  const handleParentChange = useCallback(
    async (taskId: string, parent: TaskParent | null) => {
      setFeatureLanes((prev) =>
        setFeatureLaneDraftIssueParent(
          prev ?? emptyFeatureLanesDocument(),
          taskId,
          parent && isFeatureLaneDraftParent(parent) ? parent.id : null
        )
      );
      const previousParent = applyLocalTaskParent(setTasks, taskId, parent);
      onParentLayoutChanged?.();
      const trackerParentKey = trackerParentKeyAfterPlannerChange(previousParent, parent);
      if (trackerParentKey === undefined) {
        return;
      }
      const ok = await updateIssueParent(taskId, trackerParentKey, selectedSprintId);
      if (ok) {
        return;
      }
      applyLocalTaskParent(setTasks, taskId, previousParent ?? null);
      setFeatureLanes((prev) =>
        setFeatureLaneDraftIssueParent(
          prev ?? emptyFeatureLanesDocument(),
          taskId,
          isFeatureLaneDraftParent(previousParent ?? null) ? previousParent?.id ?? null : null
        )
      );
      onParentLayoutChanged?.();
      toast.error(t('sprintPlanner.contextMenu.parentUpdateFailed'));
    },
    [onParentLayoutChanged, selectedSprintId, setFeatureLanes, setTasks, t]
  );

  return { handleParentChange };
}
