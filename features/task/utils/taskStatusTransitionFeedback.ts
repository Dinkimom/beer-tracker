/**
 * Отклик карточки на смену статуса: «в процессе» сразу после выбора перехода,
 * затем плавная перекраска с подсветкой (успех) или встряска с откатом (ошибка).
 */

export type TaskStatusTransitionPhase = 'applied' | 'failed' | 'pending';

export const TASK_STATUS_TRANSITION_APPLIED_MS = 700;
export const TASK_STATUS_TRANSITION_FAILED_MS = 600;

const phaseByTaskId = new Map<string, TaskStatusTransitionPhase>();
const settleTimers = new Map<string, ReturnType<typeof setTimeout>>();
let snapshot: ReadonlyMap<string, TaskStatusTransitionPhase> = new Map();
const listeners = new Set<() => void>();
const emptySnapshot: ReadonlyMap<string, TaskStatusTransitionPhase> = new Map();

function emitTaskStatusTransition(): void {
  snapshot = new Map(phaseByTaskId);
  for (const listener of listeners) {
    listener();
  }
}

function clearSettleTimer(taskId: string): void {
  const timer = settleTimers.get(taskId);
  if (timer != null) {
    globalThis.clearTimeout(timer);
    settleTimers.delete(taskId);
  }
}

export function subscribeTaskStatusTransition(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTaskStatusTransitionSnapshot(): ReadonlyMap<string, TaskStatusTransitionPhase> {
  return snapshot;
}

export function getTaskStatusTransitionServerSnapshot(): ReadonlyMap<
  string,
  TaskStatusTransitionPhase
> {
  return emptySnapshot;
}

export function clearTaskStatusTransition(taskId: string): void {
  clearSettleTimer(taskId);
  if (!phaseByTaskId.delete(taskId)) return;
  emitTaskStatusTransition();
}

export function markTaskStatusTransitionPending(taskId: string): void {
  clearSettleTimer(taskId);
  if (phaseByTaskId.get(taskId) === 'pending') return;
  phaseByTaskId.set(taskId, 'pending');
  emitTaskStatusTransition();
}

/** Завершить переход: короткая анимация итога, затем карточка в покое. */
export function settleTaskStatusTransition(taskId: string, outcome: 'applied' | 'failed'): void {
  clearSettleTimer(taskId);
  phaseByTaskId.set(taskId, outcome);
  emitTaskStatusTransition();
  const duration =
    outcome === 'applied' ? TASK_STATUS_TRANSITION_APPLIED_MS : TASK_STATUS_TRANSITION_FAILED_MS;
  settleTimers.set(
    taskId,
    globalThis.setTimeout(() => {
      settleTimers.delete(taskId);
      if (phaseByTaskId.get(taskId) !== outcome) return;
      phaseByTaskId.delete(taskId);
      emitTaskStatusTransition();
    }, duration)
  );
}

export function taskStatusTransitionClassName(
  phase: TaskStatusTransitionPhase | undefined
): string {
  return phase ? ` task-status-transition task-status-transition-${phase}` : '';
}
