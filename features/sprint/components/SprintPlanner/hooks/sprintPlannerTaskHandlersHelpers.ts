import type { Task } from '@/types';

import { getTaskPoints, isEffectivelyQaTask } from '@/features/task/utils/taskUtils';

export function resolveDevTaskForResize(
  task: Task,
  tasksMap: Map<string, Task>
): Task {
  const effectiveIsQa = isEffectivelyQaTask(task);
  if (effectiveIsQa && task.originalTaskId) {
    return tasksMap.get(task.originalTaskId) ?? task;
  }
  return task;
}

export function currentEstimateForResizeTask(
  devTask: Task | null,
  effectiveIsQa: boolean
): number | null {
  if (devTask == null) {
    return null;
  }
  if (effectiveIsQa) {
    return devTask.testPoints ?? 0;
  }
  return getTaskPoints(devTask);
}

export function issueKeyForEstimateSync(
  devTask: Task,
  effectiveIsQa: boolean
): string {
  if (!effectiveIsQa) {
    return devTask.id;
  }
  if (devTask.team === 'QA') {
    return devTask.originalTaskId ?? devTask.id;
  }
  return devTask.id;
}
