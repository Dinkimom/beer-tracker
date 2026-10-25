import type { Task, TaskPosition } from '@/types';
import type { QueryClient } from '@tanstack/react-query';

import toast from 'react-hot-toast';

import { getPartsPerDay } from '@/constants';
import { upsertSprintTaskInQueries } from '@/features/task/hooks/useTasks';
import { getTaskPoints } from '@/features/task/utils/taskUtils';
import { addIssueToSprint } from '@/lib/api/issues';
import { storyPointsToTimeslots } from '@/lib/pointsUtils';

interface SubmitExistingQuickAddDraftInput {
  queryClient: QueryClient;
  selectedSprintId: number;
  selectedTask: Task;
  taskId: string;
  taskPositions: Map<string, TaskPosition>;
  /** Ячеек в таймлайне спринта: длина по SP должна поместиться целиком. */
  timelineTotalParts: number;
  savePosition: (
    position: TaskPosition,
    isQa: boolean,
    devKey?: string,
    force?: boolean
  ) => Promise<void>;
  setTaskPositions: (
    updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>,
    options: { recordHistory: boolean }
  ) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
  t: (key: string, values?: Record<string, number | string>) => string;
}

/**
 * Длина карточки существующей задачи из быстрого добавления: SP через шкалу, целиком.
 * `null` — от ячейки черновика задача не помещается до конца спринта: не укорачиваем, а не добавляем (T4).
 */
export function existingQuickAddDurationParts(
  task: Task,
  draftPosition: Pick<TaskPosition, 'startDay' | 'startPart'>,
  timelineTotalParts: number
): number | null {
  const fromPoints = Math.max(1, storyPointsToTimeslots(getTaskPoints(task)));
  const startCell = draftPosition.startDay * getPartsPerDay() + draftPosition.startPart;
  return startCell + fromPoints <= timelineTotalParts ? fromPoints : null;
}

type ExistingQuickAddFitInput = Pick<
  SubmitExistingQuickAddDraftInput,
  'selectedTask' | 't' | 'taskId' | 'taskPositions' | 'timelineTotalParts'
>;

/**
 * Вызывать до `submitExistingQuickAddDraft` (и до флага отправки): если задача не помещается —
 * тост и `false`, черновик и меню остаются, чтобы выбрать ячейку раньше.
 */
export function ensureExistingQuickAddFitsSprint(input: ExistingQuickAddFitInput): boolean {
  const draftPosition = input.taskPositions.get(input.taskId);
  if (!draftPosition) {
    return true;
  }
  if (existingQuickAddDurationParts(input.selectedTask, draftPosition, input.timelineTotalParts) != null) {
    return true;
  }
  toast.error(input.t('sprintPlanner.swimlane.quickAddMenu.existingDoesNotFitSprint'));
  return false;
}

export async function submitExistingQuickAddDraft(
  input: SubmitExistingQuickAddDraftInput
): Promise<void> {
  const draftPosition = input.taskPositions.get(input.taskId);
  if (!draftPosition) {
    return;
  }
  const issueKey = input.selectedTask.id;
  const calculatedDuration = existingQuickAddDurationParts(
    input.selectedTask,
    draftPosition,
    input.timelineTotalParts
  );
  if (calculatedDuration == null) {
    // Не помещается до конца спринта — ничего не сохраняем (тост в `ensureExistingQuickAddFitsSprint`).
    return;
  }
  const isQa = input.selectedTask.team === 'QA';
  const savedPosition: TaskPosition = {
    ...draftPosition,
    duration: calculatedDuration,
    plannedDuration: calculatedDuration,
    taskId: issueKey,
  };

  await input.savePosition(
    savedPosition,
    isQa,
    isQa ? input.selectedTask.originalTaskId : undefined,
    true
  );

  input.setTasks((prev) => [
    ...prev.filter((task) => task.id !== input.taskId && task.id !== issueKey),
    input.selectedTask,
  ]);
  upsertSprintTaskInQueries(input.queryClient, input.selectedSprintId, input.selectedTask);
  input.setTaskPositions((prev) => {
    const next = new Map(prev);
    next.delete(input.taskId);
    next.set(issueKey, savedPosition);
    return next;
  }, { recordHistory: true });

  const added = await addIssueToSprint(issueKey, input.selectedSprintId);
  if (!added) {
    toast.error(input.t('planning.featurePlanner.epicOccupancy.createTaskFailed'));
    return;
  }
  toast.success(
    input.t('sprintPlanner.swimlane.quickAddMenu.addExistingSuccess', { key: issueKey })
  );
}
