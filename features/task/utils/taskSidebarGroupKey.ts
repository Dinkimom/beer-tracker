import type { Developer, SidebarGroupBy, Task } from '@/types';

import {
  TASK_GROUP_KEY_NO_PARENT,
  TASK_GROUP_KEY_UNASSIGNED,
} from '@/features/task/constants/taskGroupKeys';

function resolveSidebarAssigneeGroupKey(
  task: Task,
  developersForGrouping: Developer[]
): string {
  const assigneeId = task.assignee;
  if (!assigneeId) {
    return TASK_GROUP_KEY_UNASSIGNED;
  }
  const developer = developersForGrouping.find(
    (dev) => dev.id === assigneeId || String(dev.id) === String(assigneeId)
  );
  const nameFromTask = task.assigneeName?.trim();
  return developer?.name || nameFromTask || assigneeId;
}

function resolveSidebarParentGroupKey(task: Task): string {
  return task.parent ? task.parent.display : TASK_GROUP_KEY_NO_PARENT;
}

/**
 * Group key for sidebar task lists (assignee / parent). Matches {@link useTaskGrouping} buckets.
 */
export function getSidebarTaskGroupKey(
  task: Task,
  groupBy: SidebarGroupBy,
  developers: Developer[],
  sortedDevelopers?: Developer[]
): string {
  if (groupBy === 'assignee') {
    return resolveSidebarAssigneeGroupKey(task, sortedDevelopers ?? developers);
  }
  if (groupBy === 'parent') {
    return resolveSidebarParentGroupKey(task);
  }
  return '';
}
