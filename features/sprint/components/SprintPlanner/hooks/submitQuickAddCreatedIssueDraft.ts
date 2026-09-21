import type { QuickAddCreateFields } from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { PositionHistoryOptions } from '@/lib/layers/application/mobx/stores/taskPositionsStore';
import type { Task, TaskParent, TaskPosition } from '@/types';
import type { QueryClient } from '@tanstack/react-query';

import toast from 'react-hot-toast';

import { upsertSprintTaskInQueries } from '@/features/task/hooks/useTasks';
import { createIssue } from '@/lib/api/issues';

import {
  plannerDraftParentFromKey,
  trackerAssigneeKeyForCreate,
  trackerParentKeyForCreate,
} from './applyQuickAddDraftFields';

interface SubmitQuickAddCreatedIssueDraftInput {
  boardIdForPlannerData: number;
  draftTitle: string | undefined;
  featureDraftRowNamesById: Map<string, string>;
  fields: QuickAddCreateFields | undefined;
  forDemoPlanner: boolean;
  queryClient: QueryClient;
  quickAddParentTasks: TaskParent[];
  selectedSprintId: number;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  taskId: string;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  getQueueByBoardId: (boardId: number | null) => string | null;
  onOpenCreatedTask: (task: Task) => void;
  persistPlannerDraftParent: (issueKey: string, parent: TaskParent | undefined) => void;
  savePosition: (
    position: TaskPosition,
    isQa: boolean,
    devKey?: string,
    force?: boolean,
    options?: { recordHistory?: boolean }
  ) => Promise<void>;
  setTaskPositions: (
    positions:
      | Map<string, TaskPosition>
      | ((prev: Map<string, TaskPosition>) => Map<string, TaskPosition>),
    options?: PositionHistoryOptions
  ) => void;
  t: (key: string, values?: Record<string, number | string>) => string;
}

export async function submitQuickAddCreatedIssueDraft(
  input: SubmitQuickAddCreatedIssueDraftInput
): Promise<void> {
  const draftTask = input.tasks.find((task) => task.id === input.taskId && task.isLocalTask);
  const draftPosition = input.taskPositions.get(input.taskId);
  if (!draftTask || !draftPosition) {
    return;
  }

  const queue =
    input.fields?.queueKey.trim() ||
    draftTask.trackerQueue?.trim() ||
    input.getQueueByBoardId(input.boardIdForPlannerData);
  if (!queue) {
    toast.error(input.t('task.mutations.tasksReloadFailed'));
    return;
  }

  const issueType = input.fields?.issueType.trim() || draftTask.type?.trim() || 'task';
  const rawParentKey =
    input.fields?.parentKey.trim() ||
    draftTask.parent?.key?.trim() ||
    draftTask.parent?.id?.trim() ||
    undefined;
  const parentKey = trackerParentKeyForCreate(rawParentKey);
  const plannerParent = plannerDraftParentFromKey(
    rawParentKey,
    input.quickAddParentTasks,
    input.featureDraftRowNamesById
  );

  const created = await createIssue({
    summary:
      input.draftTitle?.trim() ||
      draftTask.name?.trim() ||
      input.t('sprintPlanner.swimlane.quickAddPreviewTitle'),
    assignee: trackerAssigneeKeyForCreate(draftPosition.assignee, input.fields?.assigneeId),
    parent: parentKey,
    queue,
    sprintId: input.selectedSprintId,
    type: issueType,
  });
  if (!created.success || !created.key || !created.task) {
    toast.error(
      created.error || input.t('planning.featurePlanner.epicOccupancy.createTaskFailed')
    );
    return;
  }

  const issueKey = created.key;
  const createdTask = plannerParent
    ? { ...created.task, parent: plannerParent }
    : created.task;
  input.persistPlannerDraftParent(issueKey, plannerParent);
  const savedPosition: TaskPosition = {
    ...draftPosition,
    taskId: issueKey,
  };
  await input.savePosition(savedPosition, false);
  input.setTasks((prev) => [
    ...prev.filter((task) => task.id !== input.taskId && task.id !== issueKey),
    createdTask,
  ]);
  upsertSprintTaskInQueries(input.queryClient, input.selectedSprintId, createdTask);
  input.setTaskPositions((prev) => {
    const next = new Map(prev);
    next.delete(input.taskId);
    next.set(issueKey, savedPosition);
    return next;
  }, { recordHistory: true });
  input.queryClient.invalidateQueries({
    queryKey: input.forDemoPlanner
      ? (['tasks', 'demo', 'occupancy', input.selectedSprintId, input.boardIdForPlannerData] as const)
      : (['tasks', 'occupancy', input.selectedSprintId, input.boardIdForPlannerData] as const),
  });
  toast.success(
    input.t('planning.featurePlanner.epicOccupancy.createTaskSuccess', { key: issueKey })
  );
  input.onOpenCreatedTask(createdTask);
}
