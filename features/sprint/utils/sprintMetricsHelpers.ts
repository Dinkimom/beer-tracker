import type { Task } from '@/types';

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

export function burndownCompletionPercent(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
}
