import type { SprintTimerState } from './sprintTimerState';

type Listener = (payload: { sprintId: number; timer: SprintTimerState }) => void;

const listeners = new Set<Listener>();

export function subscribeSprintTimerClient(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function publishSprintTimerClient(sprintId: number, timer: SprintTimerState): void {
  for (const listener of listeners) {
    listener({ sprintId, timer });
  }
}

export function resetSprintTimerClientForTests(): void {
  listeners.clear();
}
