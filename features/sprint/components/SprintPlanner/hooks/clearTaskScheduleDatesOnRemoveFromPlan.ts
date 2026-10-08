import type { Task } from '@/types';

import { buildSyntheticQaTaskId } from '@/lib/qaTaskIdentity';

/** Issue key whose start/deadline drive tracker-date fallbacks for this board card. */
export function resolveIssueKeyForScheduleClear(
  taskId: string,
  tasksMap: ReadonlyMap<string, Task>
): string | null {
  const task = tasksMap.get(taskId);
  if (task?.originalTaskId?.trim()) {
    return task.originalTaskId.trim();
  }
  const key = taskId.trim();
  return key || null;
}

/**
 * Убирает start/deadline у issue (и synthetic QA-карточки), чтобы fallback позиций
 * не вернул задачу на доску сразу после «Удалить из плана».
 */
export function clearTaskScheduleDatesInList(
  tasks: Task[],
  issueKey: string
): Task[] {
  const qaTaskId = buildSyntheticQaTaskId(issueKey);
  let changed = false;
  const next = tasks.map((task) => {
    if (task.id !== issueKey && task.id !== qaTaskId && task.originalTaskId !== issueKey) {
      return task;
    }
    if (task.start == null && task.deadline == null) {
      return task;
    }
    changed = true;
    const cleared = { ...task };
    delete cleared.start;
    delete cleared.deadline;
    return cleared;
  });
  return changed ? next : tasks;
}
