import type { Task, TaskPosition } from '@/types';

export function taskMatchesAssigneeFilter(
  task: Task,
  taskPositions: Map<string, TaskPosition>,
  selectedAssigneeIds: Set<string>
): boolean {
  const candidateIds = [
    taskPositions.get(task.id)?.assignee,
    task.assignee,
    task.qaEngineer,
  ];
  return candidateIds.some((id) => id != null && selectedAssigneeIds.has(id));
}

export function collectRelatedTaskIdsForAssigneeFilter(
  filteredByAssignee: Task[],
  qaByOriginalId: Map<string, Task>
): Set<string> {
  const relatedTaskIds = new Set<string>();
  filteredByAssignee.forEach((task) => {
    relatedTaskIds.add(task.id);
    if (task.originalTaskId) {
      relatedTaskIds.add(task.originalTaskId);
      return;
    }
    const relatedQATask = qaByOriginalId.get(task.id);
    if (relatedQATask) relatedTaskIds.add(relatedQATask.id);
  });
  return relatedTaskIds;
}

export function filterTasksByNameQuery(tasks: Task[], globalNameFilter: string): Task[] {
  const query = globalNameFilter.trim().toLowerCase();
  if (!query) return [...tasks];
  return tasks.filter(
    (t) =>
      (t.originalTaskId || t.id).toLowerCase().includes(query) ||
      (t.name || '').toLowerCase().includes(query)
  );
}
