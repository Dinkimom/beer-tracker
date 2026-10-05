import type { Task, TaskPosition } from '@/types';
import type { QueryClient } from '@tanstack/react-query';

import toast from 'react-hot-toast';

import { isSwimlaneCommentTask } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import {
  trackerAssigneeKeyForCreate,
  trackerParentKeyForCreate,
} from '@/features/sprint/components/SprintPlanner/hooks/applyQuickAddDraftFields';
import { upsertSprintTaskInQueries } from '@/features/task/hooks/useTasks';
import { getTaskTrackerDisplayKey } from '@/features/task/utils/taskUtils';
import { createIssue, getIssueTransitions } from '@/lib/api/issues';

import { buildNextPlanPosition, pickDoneTransition } from './closeOverdueAndCreateNext';

type Translate = (key: string, values?: Record<string, number | string>) => string;

interface CloseOverdueAndCreateNextRunInput {
  boardId: number | null;
  currentCell: number;
  partsPerDay: number;
  position: TaskPosition;
  queryClient: QueryClient;
  selectedSprintId: number | null;
  t: Translate;
  task: Task;
  timelineTotalParts: number;
  getQueueByBoardId: (boardId: number | null) => string | null;
  onStatusChange: (
    taskId: string,
    transitionId: string,
    targetStatusKey?: string,
    targetStatusDisplay?: string,
    screenId?: string
  ) => Promise<void>;
  savePosition: (position: TaskPosition, isQa: boolean) => Promise<void>;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}

export async function closeOverdueAndCreateNextRun(
  input: CloseOverdueAndCreateNextRunInput
): Promise<void> {
  const failed = () => toast.error(input.t('sprintPlanner.swimlane.overdue.closeAndCreateFailed'));
  if (input.task.isLocalTask || isSwimlaneCommentTask(input.task) || !input.selectedSprintId) {
    failed();
    return;
  }

  let transitions;
  try {
    transitions = await getIssueTransitions(getTaskTrackerDisplayKey(input.task));
  } catch (error) {
    console.error('Failed to load transitions for overdue close', error);
    failed();
    return;
  }

  const transition = pickDoneTransition(transitions);
  const targetKey = transition?.to?.key;
  if (!transition || !targetKey) {
    toast.error(input.t('sprintPlanner.swimlane.overdue.noCloseTransition'));
    return;
  }

  try {
    await input.onStatusChange(
      input.task.id,
      transition.id,
      targetKey,
      transition.to?.display,
      transition.screen?.id
    );
  } catch (error) {
    console.error('Failed to close overdue task', error);
    failed();
    return;
  }

  if (transition.screen?.id) {
    toast(input.t('sprintPlanner.swimlane.overdue.closeNeedsFields'));
    return;
  }

  const queue =
    input.task.trackerQueue?.trim() || input.getQueueByBoardId(input.boardId)?.trim() || '';
  const summary = input.task.name?.trim();
  if (!queue || !summary) {
    toast.error(input.t('sprintPlanner.swimlane.overdue.closeSucceededCreateFailed'));
    return;
  }

  const created = await createIssue({
    assignee: trackerAssigneeKeyForCreate(input.position.assignee, input.task.assignee),
    parent: trackerParentKeyForCreate(input.task.parent?.key ?? input.task.parent?.id),
    queue,
    sprintId: input.selectedSprintId,
    summary,
    type: input.task.type?.trim() || 'task',
  });
  if (!created.success || !created.key || !created.task) {
    toast.error(input.t('sprintPlanner.swimlane.overdue.closeSucceededCreateFailed'));
    return;
  }

  const createdTask = created.task;
  input.setTasks((prev) => [
    ...prev.filter((task) => task.id !== createdTask.id),
    createdTask,
  ]);
  upsertSprintTaskInQueries(input.queryClient, input.selectedSprintId, createdTask);

  const nextPosition = buildNextPlanPosition(
    input.position,
    input.currentCell,
    input.partsPerDay,
    input.timelineTotalParts,
    createdTask.id
  );
  if (nextPosition) {
    await input.savePosition(nextPosition, false);
  }
  toast.success(
    input.t('sprintPlanner.swimlane.overdue.closeAndCreateSuccess', { key: created.key })
  );
}
