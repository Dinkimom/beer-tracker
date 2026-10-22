'use client';

import { useMemo, useSyncExternalStore } from 'react';

import {
  getTaskBoardExitServerSnapshot,
  getTaskBoardExitSnapshot,
  resolveTaskBoardExit,
  subscribeTaskBoardExit,
  type TaskBoardExitKind,
} from '@/features/task/utils/taskBoardExit';

function useTaskBoardExits(): ReadonlyMap<string, TaskBoardExitKind> {
  return useSyncExternalStore(
    subscribeTaskBoardExit,
    getTaskBoardExitSnapshot,
    getTaskBoardExitServerSnapshot
  );
}

/** Id задач, чьи карточки сейчас уходят с доски: их связи скрываем сразу, а не после удаления. */
export function useTaskBoardExitingTaskIds(): ReadonlySet<string> {
  const exits = useTaskBoardExits();
  return useMemo(() => new Set(exits.keys()), [exits]);
}

/** Куда уходит карточка с доски (см. resolveTaskBoardExit). */
export function useTaskBoardExit(
  taskId: string,
  originalTaskId?: string
): TaskBoardExitKind | undefined {
  const exits = useTaskBoardExits();
  return resolveTaskBoardExit(exits, taskId, originalTaskId);
}
