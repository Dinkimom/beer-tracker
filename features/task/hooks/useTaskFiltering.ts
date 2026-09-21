import type { StatusFilter, Task } from '@/types';

import {
  collectQaTasksForSidebar,
  filterDevTasksBase,
  filterTasksByName,
  filterTasksByStatus,
} from './useTaskFilteringHelpers';

export { isTaskCompleted } from '@/features/task/utils/taskUtils';

interface UseTaskFilteringProps {
  goalTask?: Task | null;
  goalTaskIds?: string[];
  nameFilter: string;
  qaTasksMap: Map<string, Task>;
  statusFilter: StatusFilter;
  tasks: Task[];
}

export function useTaskFiltering({
  tasks,
  qaTasksMap,
  statusFilter,
  nameFilter,
  goalTask,
  goalTaskIds,
}: UseTaskFilteringProps) {
  const ids = goalTaskIds ?? (goalTask ? [goalTask.id] : []);
  const devTasksUnfiltered = filterDevTasksBase(tasks, ids);
  const qaTasksUnfiltered = collectQaTasksForSidebar(tasks, qaTasksMap, new Set(ids));

  const devTasksFiltered = filterTasksByStatus(
    filterTasksByName(devTasksUnfiltered, nameFilter),
    statusFilter
  );
  const qaTasksByStatus = filterTasksByStatus(
    filterTasksByName(qaTasksUnfiltered, nameFilter),
    statusFilter
  );

  return {
    devTasksCount: devTasksFiltered.length,
    qaTasksCount: qaTasksByStatus.length,
    allTasksCount: devTasksFiltered.length + qaTasksByStatus.length,
    devTasks: devTasksFiltered,
    qaTasks: qaTasksByStatus,
    allTasks: [...devTasksFiltered, ...qaTasksByStatus],
    devTasksUnfiltered,
  };
}
