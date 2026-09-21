import type { Task, TaskPosition } from '@/types';

export function buildAutoAssignBatchPayload(input: {
  positions: Map<string, TaskPosition>;
  links: Array<{
    fromAnchor?: string | null;
    fromTaskId: string;
    id: string;
    toAnchor?: string | null;
    toTaskId: string;
  }>;
  qaTasksByOriginalId: Map<string, Task>;
  tasksMap: Map<string, Task>;
}): {
  linksArray: Array<{
    fromAnchor: string | null;
    fromTaskId: string;
    id: string;
    toAnchor: string | null;
    toTaskId: string;
  }>;
  positionsArray: Array<Record<string, unknown>>;
} {
  const positionsArray = Array.from(input.positions.entries()).map(([taskId, position]) => {
    const task = input.tasksMap.get(taskId) || input.qaTasksByOriginalId.get(taskId);
    const isQa = task?.team === 'QA' || false;
    return {
      taskId: position.taskId,
      assigneeId: position.assignee,
      startDay: position.startDay,
      startPart: position.startPart,
      duration: position.duration,
      plannedStartDay: position.plannedStartDay ?? null,
      plannedStartPart: position.plannedStartPart ?? null,
      plannedDuration: position.plannedDuration ?? null,
      isQa,
      ...(isQa && task?.originalTaskId && { devTaskKey: task.originalTaskId }),
      debugSource: 'useSprintPlannerAutoAssignHandlers.handleAutoAssignTasks',
    };
  });

  const linksArray = input.links.map((link) => ({
    id: link.id,
    fromTaskId: link.fromTaskId,
    toTaskId: link.toTaskId,
    fromAnchor: link.fromAnchor || null,
    toAnchor: link.toAnchor || null,
  }));

  return { positionsArray, linksArray };
}
