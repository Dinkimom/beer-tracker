import type { Task } from '@/types';

import {
  changeIssueStatus,
  createRelatedIssue,
  getIssue,
  getIssueTransitions,
  updateIssueWork,
} from '@/lib/beerTrackerApi';
import { mapStatus } from '@/utils/statusMapper';

export interface AccountWorkData {
  burnedStoryPoints: number;
  burnedTestPoints: number;
  newTaskTitle: string;
  remainingStoryPoints: number;
  remainingTestPoints: number;
  targetSprintId: number | null;
}

function resolveAccountWorkTaskId(accountWorkModal: Task): string {
  if (accountWorkModal.team === 'QA' && accountWorkModal.originalTaskId) {
    return accountWorkModal.originalTaskId;
  }
  return accountWorkModal.id;
}

function resolveAccountWorkCurrentTask(
  tasks: Task[],
  accountWorkModal: Task
): { actualTaskId: string; currentTask: Task | undefined } {
  const lookupId = resolveAccountWorkTaskId(accountWorkModal);
  const currentTask = tasks.find((t) => t.id === lookupId || t.originalTaskId === lookupId);
  const actualTaskId = currentTask?.id || accountWorkModal.id;
  return { actualTaskId, currentTask };
}

function updateTaskInArray(tasks: Task[], taskId: string, updater: (task: Task) => Task): Task[] {
  return tasks.map((task) => {
    if (task.id === taskId || task.originalTaskId === taskId) {
      return updater(task);
    }
    if (task.originalTaskId === taskId) {
      return updater(task);
    }
    return task;
  });
}

function applyBurnedPointsToTasks(
  tasks: Task[],
  actualTaskId: string,
  accountWorkModal: Task,
  taskId: string,
  data: AccountWorkData
): Task[] {
  return updateTaskInArray(tasks, actualTaskId, (task) => {
    if (task.id === actualTaskId) {
      return {
        ...task,
        storyPoints: data.burnedStoryPoints,
        testPoints: data.burnedTestPoints,
      };
    }
    if (accountWorkModal.team !== 'QA' && task.originalTaskId === taskId) {
      return { ...task, testPoints: data.burnedTestPoints };
    }
    return task;
  });
}

function applyClosedStatusFromIssue(
  tasks: Task[],
  actualTaskId: string,
  data: AccountWorkData,
  statusKey: string
): Task[] {
  return updateTaskInArray(tasks, actualTaskId, (task) => {
    if (task.id !== actualTaskId) return task;
    return {
      ...task,
      originalStatus: statusKey,
      status: mapStatus(statusKey),
      storyPoints: data.burnedStoryPoints,
      testPoints: data.burnedTestPoints,
    };
  });
}

function applyOptimisticClosedStatus(
  tasks: Task[],
  actualTaskId: string,
  data: AccountWorkData,
  targetStatusKey: string
): Task[] {
  return applyClosedStatusFromIssue(tasks, actualTaskId, data, targetStatusKey);
}

function rollbackAccountWorkTask(
  tasks: Task[],
  actualTaskId: string,
  currentTask: Task
): Task[] {
  return updateTaskInArray(tasks, actualTaskId, (task) => {
    if (task.id !== actualTaskId) return task;
    return {
      ...task,
      originalStatus: currentTask.originalStatus,
      status: currentTask.status,
      storyPoints: currentTask.storyPoints,
      testPoints: currentTask.testPoints,
    };
  });
}

function findCloseTransition(
  transitions: Array<{ display?: string; id: string; to?: { key?: string } }>
): { display?: string; id: string; to?: { key?: string } } | undefined {
  return transitions.find(
    (t) =>
      t.to?.key?.toLowerCase() === 'closed' || t.display?.toLowerCase().includes('закрыт')
  );
}

function buildRelatedIssuePayload(accountWorkModal: Task, data: AccountWorkData) {
  return {
    title: data.newTaskTitle,
    storyPoints: data.remainingStoryPoints ?? undefined,
    testPoints: data.remainingTestPoints ?? undefined,
    sprintId: data.targetSprintId ?? undefined,
    assignee: accountWorkModal.assignee,
    team: accountWorkModal.team,
    priority: accountWorkModal.priority,
    functionalTeam: accountWorkModal.functionalTeam,
    productTeam: accountWorkModal.productTeam,
    stage: accountWorkModal.stage,
    parent:
      typeof accountWorkModal.parent === 'object' && accountWorkModal.parent
        ? accountWorkModal.parent.key
        : accountWorkModal.parent,
  };
}

async function syncClosedStatusFromApi(
  taskId: string,
  actualTaskId: string,
  data: AccountWorkData,
  closeTransition: { to?: { key?: string } },
  setTasks: (updater: (prev: Task[]) => Task[]) => void
): Promise<void> {
  const issueData = await getIssue(taskId);
  if (issueData) {
    const statusKey = issueData.statusKey || issueData.originalStatus;
    if (statusKey) {
      setTasks((prev) => applyClosedStatusFromIssue(prev, actualTaskId, data, statusKey));
    }
    return;
  }
  const targetStatusKey = closeTransition.to?.key || 'closed';
  setTasks((prev) => applyOptimisticClosedStatus(prev, actualTaskId, data, targetStatusKey));
}

async function closeAccountWorkTask(input: {
  accountWorkModal: Task;
  actualTaskId: string;
  data: AccountWorkData;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
  taskId: string;
}): Promise<void> {
  const transitions = await getIssueTransitions(input.taskId);
  if (transitions.length === 0) throw new Error('Failed to fetch transitions');

  const closeTransition = findCloseTransition(transitions);
  if (!closeTransition) throw new Error('Close transition not found');

  const statusSuccess = await changeIssueStatus(input.taskId, closeTransition.id, 'fixed');
  if (!statusSuccess) throw new Error('Failed to close task');

  await syncClosedStatusFromApi(
    input.taskId,
    input.actualTaskId,
    input.data,
    closeTransition,
    input.setTasks
  );
}

async function executeAccountWorkFlow(input: {
  accountWorkModal: Task;
  data: AccountWorkData;
  onTasksReload?: () => Promise<void> | void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
  tasks: Task[];
}): Promise<void> {
  const taskId = resolveAccountWorkTaskId(input.accountWorkModal);
  const { actualTaskId } = resolveAccountWorkCurrentTask(input.tasks, input.accountWorkModal);

  const updateSuccess = await updateIssueWork(taskId, input.data.burnedStoryPoints, input.data.burnedTestPoints);
  if (!updateSuccess) throw new Error('Failed to update work');

  input.setTasks((prev) =>
    applyBurnedPointsToTasks(prev, actualTaskId, input.accountWorkModal, taskId, input.data)
  );

  await closeAccountWorkTask({
    accountWorkModal: input.accountWorkModal,
    actualTaskId,
    data: input.data,
    setTasks: input.setTasks,
    taskId,
  });

  const createResult = await createRelatedIssue(
    taskId,
    buildRelatedIssuePayload(input.accountWorkModal, input.data)
  );
  if (!createResult.success) {
    throw new Error(createResult.error || 'Failed to create related task');
  }

  if (input.onTasksReload) await input.onTasksReload();
}

export async function runAccountWorkWithRollback(input: {
  accountWorkModal: Task;
  data: AccountWorkData;
  onTasksReload?: () => Promise<void> | void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
  tasks: Task[];
}): Promise<void> {
  const { actualTaskId, currentTask } = resolveAccountWorkCurrentTask(input.tasks, input.accountWorkModal);
  try {
    await executeAccountWorkFlow(input);
  } catch (error) {
    if (currentTask) {
      input.setTasks((prev) => rollbackAccountWorkTask(prev, actualTaskId, currentTask));
    }
    throw error;
  }
}
