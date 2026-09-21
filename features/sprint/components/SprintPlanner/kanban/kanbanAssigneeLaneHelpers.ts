import type { Developer, Task } from '@/types';

import { TASK_GROUP_KEY_UNASSIGNED } from '@/features/task/constants/taskGroupKeys';

function resolveAssigneeLaneFromId(
  task: Task,
  developers: Developer[]
): { key: string; name: string } | null {
  if (!task.assignee?.trim()) return null;
  const d = developers.find((dev) => dev.id === task.assignee);
  return {
    key: d ? d.id : task.assignee,
    name: d ? d.name : (task.assigneeName || task.assignee),
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
  task: Task,
  developers: Developer[]
): { key: string; name: string } {
  const fromId = resolveAssigneeLaneFromId(task, developers);
  if (fromId) return fromId;
  const fromName = resolveAssigneeLaneFromName(task, developers);
  if (fromName) return fromName;
  return { key: '__unassigned__', name: TASK_GROUP_KEY_UNASSIGNED };
}

export function addTaskToKanbanAssigneeLane(
  keyToLane: Map<string, { assigneeName: string; developer: Developer | null; tasks: Task[] }>,
  task: Task,
  developers: Developer[]
): void {
  const { key, name } = resolveAssigneeLaneKeyAndName(task, developers);
  if (!keyToLane.has(key)) {
    keyToLane.set(key, {
      assigneeName: name,
      developer: developers.find((d) => d.id === key || d.name === key) || null,
      tasks: [],
    });
  }
  keyToLane.get(key)!.tasks.push(task);
}
