import type { Task, TaskPosition } from '@/types';

interface UseTaskStateResult {
  tasksByAssignee: Map<string, Task[]>;
  unassignedTasks: Task[];
}

interface UseTaskStateProps {
  /** Задачи и QA-задачи доски — из модели (`SprintBoard.allTasksForDrag`). */
  allTasksForDrag: Task[];
  developers: Array<{ id: string }>;
  taskPositions: Map<string, TaskPosition>;
}

/**
 * Раскладка задач по позициям: неразложенные и задачи по исполнителям. Позиции — observable.map,
 * мутируется на месте, поэтому без useMemo (иначе группировка не видит переноса).
 */
export function useTaskState({
  allTasksForDrag,
  developers,
  taskPositions,
}: UseTaskStateProps): UseTaskStateResult {
  const unassignedTasks = allTasksForDrag.filter((task) => !taskPositions.has(task.id));
  const tasksByAssignee = new Map<string, Task[]>();
  developers.forEach((dev) => {
    tasksByAssignee.set(dev.id, []);
  });
  allTasksForDrag.forEach((task) => {
    const assigneeId = taskPositions.get(task.id)?.assignee || 'unassigned';
    const bucket = tasksByAssignee.get(assigneeId);
    if (bucket) {
      bucket.push(task);
    } else {
      tasksByAssignee.set(assigneeId, [task]);
    }
  });
  return { tasksByAssignee, unassignedTasks };
}
