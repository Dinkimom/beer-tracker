import type { RetroBoard } from '@/lib/retro/retroBoard';

const inflight = new Map<number, number>();
const synced = new Map<number, RetroBoard | null>();

export function trackRetroSave(sprintId: number, delta: -1 | 1): void {
  const next = (inflight.get(sprintId) ?? 0) + delta;
  if (next <= 0) inflight.delete(sprintId);
  else inflight.set(sprintId, next);
}

export function isRetroSaveInflight(sprintId: number): boolean {
  return (inflight.get(sprintId) ?? 0) > 0;
}

export function rememberRetroBoardSync(sprintId: number, board: RetroBoard | null): void {
  if (!isRetroSaveInflight(sprintId)) synced.set(sprintId, board);
}

export function retroBoardSyncBase(sprintId: number): RetroBoard | null {
  return synced.get(sprintId) ?? null;
}

export function commitRetroBoardSync(sprintId: number, board: RetroBoard): void {
  synced.set(sprintId, board);
}
