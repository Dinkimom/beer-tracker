import type { Task, TaskPosition } from '@/types';
import type { QueryClient } from '@tanstack/react-query';

import toast from 'react-hot-toast';

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

export async function submitExistingQuickAddDraft(
  input: SubmitExistingQuickAddDraftInput
): Promise<void> {
  const draftPosition = input.taskPositions.get(input.taskId);
  if (!draftPosition) {
    return;
  }
  const issueKey = input.selectedTask.id;
  const calculatedDuration = Math.max(1, storyPointsToTimeslots(getTaskPoints(input.selectedTask)));
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
