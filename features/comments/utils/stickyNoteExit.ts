/**
 * Снятие листа с доски вниз: карточка остаётся в списке, пока играет CSS-анимация,
 * и только потом вызывающий код убирает её.
 */

export const STICKY_NOTE_EXIT_MS = 420;
const STICKY_NOTE_EXIT_CLASS = 'sticky-note-exit';

const exitingTaskIds = new Set<string>();
let snapshot: ReadonlySet<string> = exitingTaskIds;
const listeners = new Set<() => void>();
const emptySnapshot: ReadonlySet<string> = new Set();

function emitStickyNoteExit(): void {
  snapshot = new Set(exitingTaskIds);
  for (const listener of listeners) {
    listener();
  }
}

function stickyNoteExitDurationMs(): number {
  if (typeof globalThis.matchMedia !== 'function') {
    return 0;
  }
  if (globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 0;
  }
  return STICKY_NOTE_EXIT_MS;
}

export function shouldAnimateStickyNoteDelete(
  comment: { kind?: string } | undefined,
  retargetLinksTo?: string
): boolean {
  if (retargetLinksTo) return false;
  if (!comment) return false;
  return comment.kind == null || comment.kind === 'text';
}

export function isStickyNoteExiting(taskId: string): boolean {
  return snapshot.has(taskId);
}

export function subscribeStickyNoteExit(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStickyNoteExitSnapshot(): ReadonlySet<string> {
  return snapshot;
}

export function getStickyNoteExitServerSnapshot(): ReadonlySet<string> {
  return emptySnapshot;
}

function beginStickyNoteExit(taskId: string): boolean {
  if (exitingTaskIds.has(taskId)) return false;
  exitingTaskIds.add(taskId);
  emitStickyNoteExit();
  return true;
}

function endStickyNoteExit(taskId: string): void {
  if (!exitingTaskIds.delete(taskId)) return;
  emitStickyNoteExit();
}

/** Пометить лист снимаемым и вызвать onDone после анимации. Повторный вызов игнорируется. */
export function playStickyNoteExit(taskId: string, onDone: () => void): void {
  const duration = stickyNoteExitDurationMs();
  if (duration === 0) {
    onDone();
    return;
  }
  if (!beginStickyNoteExit(taskId)) return;
  globalThis.setTimeout(() => {
    endStickyNoteExit(taskId);
    onDone();
  }, duration);
}

export function stickyNoteExitClassName(isStickyNote: boolean, exiting: boolean): string {
  if (!isStickyNote || !exiting) return '';
  return ` ${STICKY_NOTE_EXIT_CLASS}`;
}
