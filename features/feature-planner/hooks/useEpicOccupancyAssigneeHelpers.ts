import type { Task } from '@/types';

function applyQaEpicAssigneeUpdate(
  t: Task,
  task: Task,
  assigneeId: string,
  assigneeName?: string
): Task | undefined {
  if (t.id === task.originalTaskId) {
    return {
      ...t,
      qaEngineer: assigneeId,
      qaEngineerName: assigneeName ?? t.qaEngineerName,
    };
  }
  if (t.id === task.id) {
    return {
      ...t,
      assignee: assigneeId,
      assigneeName: assigneeName ?? t.assigneeName,
    };
  }
  return undefined;
}

export function mapEpicAssigneeUpdate(
  t: Task,
  task: Task,
  assigneeId: string,
  assigneeName?: string
): Task {
  if (task.team === 'QA' && task.originalTaskId) {
    return applyQaEpicAssigneeUpdate(t, task, assigneeId, assigneeName) ?? t;
  }
  if (t.id !== task.id) {
    return t;
  }
  return {
    ...t,
    assignee: assigneeId,
    assigneeName: assigneeName ?? t.assigneeName,
  };
}
