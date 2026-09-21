/**
 * Хук для обработчиков контекстного меню в SprintPlanner
 */

import type { SprintPlannerContextMenuState } from '@/lib/layers';
import type { Task, TaskParent } from '@/types';

import { useCallback } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { resolveContextMenuFollowAnchorId } from '@/features/context-menu/utils/resolveContextMenuViewportPosition';
import { isFeatureLaneDraftParent } from '@/features/swimlane/utils/featureSwimlaneRows';
import { isSwimlaneImageTaskId } from '@/features/task/utils/swimlaneImageTask';
import { useFeatureLanesApi } from '@/hooks/useApiStorage';
import { updateIssueParent } from '@/lib/api/issues';
import { useRootStore } from '@/lib/layers';
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
  const { sprintPlannerUi } = useRootStore();
  const [, setFeatureLanes] = useFeatureLanesApi(selectedSprintId);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, task: Task, isBacklogTask?: boolean, hideRemoveFromPlan?: boolean) => {
      e.preventDefault();
      e.stopPropagation();

      if (task.isLocalTask === true || isSwimlaneImageTaskId(task.id)) {
        return;
      }

      sprintPlannerUi.closeNoteComposer();
      sprintPlannerUi.setContextMenuTaskId(task.id);

      const startEl = e.currentTarget as HTMLElement | null;
      // Кнопка «⋯» в строке занятости — currentTarget = button; якорим меню к строке задачи.
      const anchoredEl =
        startEl?.closest<HTMLElement>('[data-context-menu-source="task-card"]') ??
        startEl?.closest<HTMLElement>('[data-context-menu-source="occupancy-phase"]') ??
        startEl?.closest<HTMLElement>('[data-context-menu-source="occupancy-task-row"]') ??
        startEl;
      const menuSource = anchoredEl?.getAttribute('data-context-menu-source');
      const fromAnchoredElement =
        menuSource === 'task-card' ||
        menuSource === 'occupancy-phase' ||
        menuSource === 'occupancy-task-row';
      let anchorRect: SprintPlannerContextMenuState['anchorRect'];
      let position = { x: e.clientX, y: e.clientY };
      if (fromAnchoredElement && anchoredEl) {
        const r = anchoredEl.getBoundingClientRect();
        anchorRect = {
          bottom: r.bottom,
          height: r.height,
          left: r.left,
          right: r.right,
          top: r.top,
          width: r.width,
        };
        position = { x: r.right + 8, y: r.top };
      }

      const fromOccupancyRowMenuButton = Boolean(
        startEl?.closest<HTMLElement>('[data-occupancy-row-context-menu-trigger="true"]')
      );
      const dimPeerUi =
        !(menuSource === 'occupancy-task-row' && fromOccupancyRowMenuButton);

      sprintPlannerUi.setContextMenu({
        task,
        position,
        anchorRect,
        anchorElementId: resolveContextMenuFollowAnchorId(anchoredEl),
        dimPeerUi,
        isBacklogTask: isBacklogTask || false,
        hideRemoveFromPlan: hideRemoveFromPlan || false,
      });
    },
    [sprintPlannerUi]
  );

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

  return {
    handleContextMenu,
    handleParentChange,
  };
}
