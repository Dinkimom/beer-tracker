import type { Developer, SidebarGroupBy, Task } from '@/types';

import { groupTasksByCriteria, sortTaskGroupKeys } from './useTaskGroupingHelpers';

interface UseTaskGroupingProps {
  developers: Developer[];
  groupBy: SidebarGroupBy;
  sortedDevelopers?: Developer[];
  tasks: Task[];
}

export function useTaskGrouping({
  tasks,
  groupBy,
  developers,
  sortedDevelopers,
}: UseTaskGroupingProps) {
  const groupedTasks = groupTasksByCriteria(tasks, groupBy, developers, sortedDevelopers);
  const groupKeys = sortTaskGroupKeys(Object.keys(groupedTasks), groupBy, sortedDevelopers);

  return { groupedTasks, groupKeys };
}
