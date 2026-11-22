import type { Developer, Task } from '@/types';

import { TASK_GROUP_KEY_UNASSIGNED } from '@/features/task/constants/taskGroupKeys';

function resolveAssigneeLaneFromId(
  assigneeId: string | undefined,
  task: Task,
  developers: Developer[]
): { key: string; name: string } | null {
  if (!assigneeId?.trim()) return null;
  const d = developers.find((dev) => dev.id === assigneeId);
  const ownName = assigneeId === task.assignee ? task.assigneeName : undefined;
  return {
    key: d ? d.id : assigneeId,
    name: d ? d.name : (ownName || assigneeId),
  };
}

function resolveAssigneeLaneFromName(
  task: Task,
  developers: Developer[]
): { key: string; name: string } | null {
  if (!task.assigneeName?.trim()) return null;
  const d = developers.find((dev) => dev.name === task.assigneeName);
  if (d) return { key: d.id, name: d.name };
  return { key: task.assigneeName, name: task.assigneeName };
}

function resolveAssigneeLaneKeyAndName(
  assigneeId: string | undefined,
  task: Task,
  developers: Developer[]
): { key: string; name: string } {
  const fromId = resolveAssigneeLaneFromId(assigneeId, task, developers);
  if (fromId) return fromId;
  const fromName = resolveAssigneeLaneFromName(task, developers);
  if (fromName) return fromName;
  return { key: '__unassigned__', name: TASK_GROUP_KEY_UNASSIGNED };
}

export function addTaskToKanbanAssigneeLane(
  keyToLane: Map<string, { assigneeName: string; developer: Developer | null; tasks: Task[] }>,
  task: Task,
  developers: Developer[],
  /** Строка доски, где стоит карточка (см. `SprintBoard.rowAssigneeOf`); по умолчанию — исполнитель. */
  assigneeId: string | undefined = task.assignee
): void {
  const { key, name } = resolveAssigneeLaneKeyAndName(assigneeId, task, developers);
  if (!keyToLane.has(key)) {
    keyToLane.set(key, {
      assigneeName: name,
      developer: developers.find((d) => d.id === key || d.name === key) || null,
      tasks: [],
    });
  }
  keyToLane.get(key)!.tasks.push(task);
}
