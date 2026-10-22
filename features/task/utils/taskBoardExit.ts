/**
 * Уход карточки с доски: перенос в другой спринт, в бэклог или снятие с плана.
 * Карточка остаётся в списке, пока играет CSS-анимация, и только потом
 * вызывающий код её убирает.
 */

export type TaskBoardExitKind = 'backlog' | 'plan' | 'sprint';

export const TASK_BOARD_EXIT_MS = 620;

const exitKindByTaskId = new Map<string, TaskBoardExitKind>();
let snapshot: ReadonlyMap<string, TaskBoardExitKind> = new Map();
const listeners = new Set<() => void>();
const emptySnapshot: ReadonlyMap<string, TaskBoardExitKind> = new Map();

function emitTaskBoardExit(): void {
  snapshot = new Map(exitKindByTaskId);
  for (const listener of listeners) {
    listener();
  }
}

function taskBoardExitDurationMs(): number {
  if (typeof globalThis.matchMedia !== 'function') {
    return 0;
  }
  if (globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 0;
  }
  return TASK_BOARD_EXIT_MS;
}

export function subscribeTaskBoardExit(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTaskBoardExitSnapshot(): ReadonlyMap<string, TaskBoardExitKind> {
  return snapshot;
}

export function getTaskBoardExitServerSnapshot(): ReadonlyMap<string, TaskBoardExitKind> {
  return emptySnapshot;
}

/**
 * Проиграть уход карточек (dev + QA одной задачи) и вызвать onDone после анимации.
 * Без анимации (reduced motion, SSR, тесты) onDone вызывается синхронно.
 */
export function playTaskBoardExit(
  taskIds: readonly string[],
  kind: TaskBoardExitKind,
  onDone: () => void
): Promise<void> {
  const duration = taskBoardExitDurationMs();
  const ids = [...new Set(taskIds)];
  if (duration === 0 || ids.length === 0) {
    onDone();
    return Promise.resolve();
  }
  for (const id of ids) {
    exitKindByTaskId.set(id, kind);
  }
  emitTaskBoardExit();
  return new Promise((resolve) => {
    globalThis.setTimeout(() => {
      // Сначала убрать карточку, потом снять класс — иначе она мигнёт на кадр.
      onDone();
      for (const id of ids) {
        if (exitKindByTaskId.get(id) === kind) exitKindByTaskId.delete(id);
      }
      emitTaskBoardExit();
      resolve();
    }, duration);
  });
}

/**
 * Уход карточки по её id; QA-карточка уходит вместе с dev-задачей при переносе
 * из спринта, но не при снятии с плана — у неё своя позиция на доске.
 */
export function resolveTaskBoardExit(
  exits: ReadonlyMap<string, TaskBoardExitKind>,
  taskId: string,
  originalTaskId?: string
): TaskBoardExitKind | undefined {
  const own = exits.get(taskId);
  if (own || !originalTaskId) return own;
  const parent = exits.get(originalTaskId);
  return parent === 'plan' ? undefined : parent;
}

export function taskBoardExitClassName(kind: TaskBoardExitKind | undefined): string {
  return kind ? ` task-board-exit task-board-exit-${kind}` : '';
}
