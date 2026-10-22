'use client';

import { useSyncExternalStore } from 'react';

import {
  getTaskStatusTransitionServerSnapshot,
  getTaskStatusTransitionSnapshot,
  subscribeTaskStatusTransition,
  type TaskStatusTransitionPhase,
} from '@/features/task/utils/taskStatusTransitionFeedback';

/** Фаза перехода карточки; QA-карточка откликается и на переход своей dev-задачи. */
export function useTaskStatusTransitionPhase(
  taskId: string,
  originalTaskId?: string
): TaskStatusTransitionPhase | undefined {
  const phases = useSyncExternalStore(
    subscribeTaskStatusTransition,
    getTaskStatusTransitionSnapshot,
    getTaskStatusTransitionServerSnapshot
  );
  return phases.get(taskId) ?? (originalTaskId ? phases.get(originalTaskId) : undefined);
}
