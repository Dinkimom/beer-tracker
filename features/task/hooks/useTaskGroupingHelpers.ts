import type { Developer, SidebarGroupBy, Task } from '@/types';

import { isTaskGroupSentinelKey } from '@/features/task/constants/taskGroupKeys';
import { getSidebarTaskGroupKey } from '@/features/task/utils/taskSidebarGroupKey';

function groupTasksByAssignee(
  tasks: Task[],
  developers: Developer[],
  developersForGrouping: Developer[]
): Record<string, Task[]> {
  const groups: Record<string, Task[]> = {};

  tasks.forEach((task) => {
    const groupKey = getSidebarTaskGroupKey(
      task,
      'assignee',
      developers,
      developersForGrouping
    );

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(task);
  });

  return groups;
}

function groupTasksByParent(tasks: Task[], developers: Developer[]): Record<string, Task[]> {
  const groups: Record<string, Task[]> = {};
  tasks.forEach((task) => {
    const groupKey = getSidebarTaskGroupKey(task, 'parent', developers);

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(task);
  });
  return groups;
}

function groupTasksByCriteria(
  tasks: Task[],
  groupBy: SidebarGroupBy,
  developers: Developer[],
  sortedDevelopers?: Developer[]
): Record<string, Task[]> {
  if (groupBy === 'none') {
    return { '': tasks };
  }
  if (groupBy === 'assignee') {
    return groupTasksByAssignee(tasks, developers, sortedDevelopers || developers);
  }
  if (groupBy === 'parent') {
    return groupTasksByParent(tasks, developers);
  }
  return { '': tasks };
}

function compareSentinelGroupKeys(a: string, b: string): number | null {
  const aIsEmpty = isTaskGroupSentinelKey(a);
  const bIsEmpty = isTaskGroupSentinelKey(b);
  if (aIsEmpty === bIsEmpty) {
    return aIsEmpty ? 0 : null;
  }
  return aIsEmpty ? 1 : -1;
}

function compareDeveloperNameOrder(
  a: string,
  b: string,
  devNameOrder: Map<string, number>
): number {
  const aOrder = devNameOrder.get(a);
  const bOrder = devNameOrder.get(b);
  if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
  if (aOrder !== undefined) return -1;
  if (bOrder !== undefined) return 1;
  return a.localeCompare(b);
}

function compareAssigneeGroupKeys(
  a: string,
  b: string,
  devNameOrder: Map<string, number>
): number {
  const sentinelResult = compareSentinelGroupKeys(a, b);
  if (sentinelResult !== null) return sentinelResult;
  return compareDeveloperNameOrder(a, b, devNameOrder);
}

function sortTaskGroupKeys(
  keys: string[],
  groupBy: SidebarGroupBy,
  sortedDevelopers?: Developer[]
): string[] {
  if (groupBy === 'assignee' && sortedDevelopers) {
    const devNameOrder = new Map(sortedDevelopers.map((dev, index) => [dev.name, index]));
    return keys.sort((a, b) => compareAssigneeGroupKeys(a, b, devNameOrder));
  }

  return keys.sort((a, b) => {
    const sentinelResult = compareSentinelGroupKeys(a, b);
    if (sentinelResult !== null) {
      return sentinelResult;
    }
    return a.localeCompare(b);
  });
}

export {
  groupTasksByCriteria,
  sortTaskGroupKeys,
};
