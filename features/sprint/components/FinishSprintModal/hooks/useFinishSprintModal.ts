/**
 * Хук для управления логикой завершения спринта
 */

import type { MoveTasksTo, Task } from '@/types';
import type { ChecklistItem, SprintInfo, SprintListItem } from '@/types/tracker';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

import {
  canUpdateFinishSprintCheckbox,
  findFinishSprintChecklistItem,
  mapFinishSprintCheckboxItems,
  notifyFinishSprintCheckboxFailure,
  updateFinishSprintGoalCheckbox,
} from './useFinishSprintModalCheckboxHelpers';
import { closeTrackerGoalTasks } from './useFinishSprintModalCloseHelpers';
import {
  archiveSprintOnFinish,
  resolveFinishSprintDefaultMoveTarget,
  validateFinishSprintSubmit,
} from './useFinishSprintModalHelpers';
import { moveUnfinishedTasksOnFinish } from './useFinishSprintModalMoveHelpers';

type ChecklistItemWithGoalId = ChecklistItem & { goalTaskId?: string; goalSource?: 'sprint_goals' | 'tracker' };

interface UseFinishSprintModalProps {
  /** id — ключ задачи в Tracker; для целей из sprint_goals id синтетический (delivery/discovery) — закрытие задачи в Tracker не вызываем */
  goalTasks: Array<{ id: string; source?: 'sprint_goals' | 'tracker' }>;
  initialChecklistItems: ChecklistItemWithGoalId[];
  isOpen: boolean;
  sprintInfo: {
    id: number;
    status: string;
    version?: number;
  } | null;
  sprints: SprintListItem[];
  tasks: Task[];
  onSprintStatusChange?: (updatedSprint: SprintInfo) => void;
  onTasksReload?: () => void;
}

export function useFinishSprintModal({
  goalTasks,
  initialChecklistItems,
  sprintInfo,
  sprints,
  tasks,
  isOpen,
  onSprintStatusChange,
  onTasksReload,
}: UseFinishSprintModalProps) {
  const [checklistItems, setChecklistItems] = useState<ChecklistItemWithGoalId[]>(initialChecklistItems);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [moveTasksTo, setMoveTasksTo] = useState<MoveTasksTo>('backlog');
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setChecklistItems(initialChecklistItems);
    const defaults = resolveFinishSprintDefaultMoveTarget({
      currentSprintId: sprintInfo?.id ?? null,
      sprints,
    });
    setMoveTasksTo(defaults.moveTasksTo);
    setSelectedSprintId(defaults.selectedSprintId);
  }, [isOpen, initialChecklistItems, sprintInfo?.id, sprints]);

  const handleCheckboxChange = useCallback(async (itemId: string, checked: boolean) => {
    if (updatingItems.has(itemId)) return;
    const item = findFinishSprintChecklistItem(checklistItems, itemId);
    if (!canUpdateFinishSprintCheckbox(item)) return;

    setUpdatingItems(prev => new Set(prev).add(itemId));
    setChecklistItems(prev => mapFinishSprintCheckboxItems(prev, itemId, checked));

    try {
      const success = await updateFinishSprintGoalCheckbox(item!, checked);
      if (!success) {
        setChecklistItems(prev => mapFinishSprintCheckboxItems(prev, itemId, !checked));
        notifyFinishSprintCheckboxFailure();
      }
    } catch (err) {
      console.error('Failed to update checkbox:', err);
      setChecklistItems(prev => mapFinishSprintCheckboxItems(prev, itemId, !checked));
      notifyFinishSprintCheckboxFailure();
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }, [checklistItems, updatingItems]);

  const handleSubmit = useCallback(async () => {
    if (!validateFinishSprintSubmit({
      moveTasksTo,
      selectedSprintId,
      sprintInfo,
    })) {
      return;
    }

    setIsLoading(true);
    try {
      await moveUnfinishedTasksOnFinish({
        goalTasks,
        moveTasksTo,
        selectedSprintId,
        tasks,
      });

      await closeTrackerGoalTasks(goalTasks);

      const archived = await archiveSprintOnFinish({
        onSprintStatusChange,
        onTasksReload,
        sprintInfo: sprintInfo!,
      });
      if (!archived) return;
    } catch (error) {
      console.error('Failed to finish sprint:', error);
      toast.error('Не удалось завершить спринт');
    } finally {
      setIsLoading(false);
    }
  }, [
    sprintInfo,
    moveTasksTo,
    selectedSprintId,
    tasks,
    goalTasks,
    onSprintStatusChange,
    onTasksReload,
  ]);

  return {
    checklistItems,
    updatingItems,
    moveTasksTo,
    setMoveTasksTo,
    selectedSprintId,
    setSelectedSprintId,
    isLoading,
    handleCheckboxChange,
    handleSubmit,
  };
}
