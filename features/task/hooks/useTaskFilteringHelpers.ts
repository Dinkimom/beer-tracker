import type { StatusFilter, Task } from '@/types';

import { isEffectivelyQaTask, isTaskCompleted } from '@/features/task/utils/taskUtils';

function filterDevTasksBase(tasks: Task[], goalIds: string[]): Task[] {
  const devTasks = tasks.filter((task) => !isEffectivelyQaTask(task));
  if (goalIds.length === 0) {
    return devTasks;
  }
  const goalSet = new Set(goalIds);
  return devTasks.filter((task) => !goalSet.has(task.id));
}

function addEffectiveQaTaskToSidebar(
  task: Task,
  qaTasks: Task[],
  qaIdsAdded: Set<string>
): void {
  if (!qaIdsAdded.has(task.id)) {
    qaIdsAdded.add(task.id);
    qaTasks.push(task);
  }
}

function addQaTaskFromDevToSidebar(
  task: Task,
  qaTasksMap: Map<string, Task>,
  qaTasks: Task[],
  qaIdsAdded: Set<string>
): void {
  const qaTaskFromDev = qaTasksMap.get(task.id);
  if (qaTaskFromDev && !qaIdsAdded.has(qaTaskFromDev.id)) {
    qaIdsAdded.add(qaTaskFromDev.id);
    qaTasks.push(qaTaskFromDev);
  }
}

function collectQaTasksForSidebar(
  tasks: Task[],
  qaTasksMap: Map<string, Task>,
  goalSet: Set<string>
): Task[] {
  const qaTasks: Task[] = [];
  const qaIdsAdded = new Set<string>();

  tasks.forEach((task) => {
    if (goalSet.has(task.id)) return;
    if (isEffectivelyQaTask(task)) {
      addEffectiveQaTaskToSidebar(task, qaTasks, qaIdsAdded);
      return;
    }
    addQaTaskFromDevToSidebar(task, qaTasksMap, qaTasks, qaIdsAdded);
  });

  return qaTasks;
}

function filterTasksByName(tasks: Task[], nameFilter: string): Task[] {
  if (!nameFilter.trim()) {
    return [...tasks];
  }
  const searchTerm = nameFilter.trim().toLowerCase();
  return tasks.filter(
    (task) =>
      task.name.toLowerCase().includes(searchTerm) ||
      task.id.toLowerCase().includes(searchTerm)
  );
}

function filterTasksByStatus(tasks: Task[], statusFilter: StatusFilter): Task[] {
  if (statusFilter === 'completed') {
    return tasks.filter((task) => isTaskCompleted(task));
  }
  if (statusFilter === 'active') {
    return tasks.filter((task) => !isTaskCompleted(task));
  }
  return [...tasks];
}

export { filterDevTasksBase, collectQaTasksForSidebar, filterTasksByName, filterTasksByStatus };
