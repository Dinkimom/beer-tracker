import type { SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';
import type { Task } from '@/types';

import { getTaskStoryPoints, getTaskTestPoints, isOriginalTask } from '@/lib/pointsUtils';

import { isDone, isTpClosedStatus } from './sprintMetricsStatusHelpers';

function addDevTaskPersonIds(personIds: Set<string>, task: Task): void {
  personIds.add(task.assignee ?? '__unassigned__');
  if (task.qaEngineer) personIds.add(task.qaEngineer);
}

function addQaTaskPersonIds(personIds: Set<string>, task: Task): void {
  personIds.add(task.assignee ?? '__unassigned__');
  if (task.qaEngineer) personIds.add(task.qaEngineer);
}

export function goalTaskIdSet(goalTaskIds: string[] | string | undefined): Set<string> {
  if (goalTaskIds == null) return new Set();
  const ids = Array.isArray(goalTaskIds) ? goalTaskIds : [goalTaskIds];
  return new Set(ids);
}

export function collectAssigneePersonIds(devTasks: Task[], qaTasks: Task[]): Set<string> {
  const personIds = new Set<string>();
  for (const t of devTasks) addDevTaskPersonIds(personIds, t);
  for (const t of qaTasks) addQaTaskPersonIds(personIds, t);
  return personIds;
}

interface BurndownScopeAccumulator {
  completedSP: number;
  completedTP: number;
  totalScopeSP: number;
  totalScopeTP: number;
}

function accumulateBurndownTaskScope(
  acc: BurndownScopeAccumulator,
  task: Task,
  rules?: SprintTaskCompletionRules | null
): void {
  const sp = getTaskStoryPoints(task);
  const tp = getTaskTestPoints(task);
  acc.totalScopeSP += sp;
  acc.totalScopeTP += tp;
  if (isDone(task, rules)) acc.completedSP += sp;
  if (isTpClosedStatus(task, rules)) acc.completedTP += tp;
}

export function computeBurndownScopeFromTasks(
  tasks: Task[],
  goalIdSet: Set<string>,
  rules?: SprintTaskCompletionRules | null
): BurndownScopeAccumulator {
  const acc: BurndownScopeAccumulator = {
    completedSP: 0,
    completedTP: 0,
    totalScopeSP: 0,
    totalScopeTP: 0,
  };
  for (const t of tasks) {
    if (!isOriginalTask(t) || goalIdSet.has(t.id)) continue;
    accumulateBurndownTaskScope(acc, t, rules);
  }
  return acc;
}

export function burndownCompletionPercent(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
}
