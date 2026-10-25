import type { Task, TaskPosition } from '@/types';

/** Несохранённый локальный черновик quick-add по id. */
export function findQuickAddDraftTask(input: { taskId: string; tasks: Task[] }): Task | undefined {
  return input.tasks.find((task) => task.id === input.taskId && task.isLocalTask);
}

/** Убирает черновик из задач и позиций доски; удаление позиции попадает в историю плана. */
export function removeQuickAddDraft(input: {
  taskId: string;
  setTaskPositions: (
    updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>,
    options: { recordHistory: boolean }
  ) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}): void {
  input.setTasks((prev) => prev.filter((task) => task.id !== input.taskId));
  input.setTaskPositions((prev) => {
    const next = new Map(prev);
    next.delete(input.taskId);
    return next;
  }, { recordHistory: true });
}
