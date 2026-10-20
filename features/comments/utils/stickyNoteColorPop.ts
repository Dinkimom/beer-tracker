/**
 * Короткий «подскок» листа при смене цвета (вместе с CSS transition заливки).
 */

export const STICKY_NOTE_COLOR_POP_MS = 320;
const STICKY_NOTE_COLOR_POP_CLASS = 'sticky-note-color-pop';

const poppingTaskIds = new Set<string>();
const popTimers = new Map<string, ReturnType<typeof setTimeout>>();
let snapshot: ReadonlySet<string> = poppingTaskIds;
const listeners = new Set<() => void>();
const emptySnapshot: ReadonlySet<string> = new Set();

function emitStickyNoteColorPop(): void {
  snapshot = new Set(poppingTaskIds);
  for (const listener of listeners) {
    listener();
  }
}

export function stickyNoteColorPopDurationMs(): number {
  if (typeof globalThis.matchMedia !== 'function') {
    return 0;
  }
  if (globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 0;
  }
  return STICKY_NOTE_COLOR_POP_MS;
}

export function isStickyNoteColorPopping(taskId: string): boolean {
  return snapshot.has(taskId);
}

export function subscribeStickyNoteColorPop(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStickyNoteColorPopSnapshot(): ReadonlySet<string> {
  return snapshot;
}

export function getStickyNoteColorPopServerSnapshot(): ReadonlySet<string> {
  return emptySnapshot;
}

function endStickyNoteColorPop(taskId: string): void {
  const timer = popTimers.get(taskId);
  if (timer != null) {
    globalThis.clearTimeout(timer);
    popTimers.delete(taskId);
  }
  if (!poppingTaskIds.delete(taskId)) return;
  emitStickyNoteColorPop();
}

/** Запустить (или перезапустить) подскок при смене цвета. */
export function playStickyNoteColorPop(taskId: string): void {
  const duration = stickyNoteColorPopDurationMs();
  if (duration === 0) {
    return;
  }
  endStickyNoteColorPop(taskId);
  poppingTaskIds.add(taskId);
  emitStickyNoteColorPop();
  popTimers.set(
    taskId,
    globalThis.setTimeout(() => {
      endStickyNoteColorPop(taskId);
    }, duration)
  );
}

export function stickyNoteColorPopClassName(isStickyNote: boolean, popping: boolean): string {
  if (!isStickyNote || !popping) return '';
  return ` ${STICKY_NOTE_COLOR_POP_CLASS}`;
}

/** Была ли смена цвета (не первый mount). */
export function shouldPlayStickyNoteColorPop(
  previousColor: string | null | undefined,
  nextColor: string | null | undefined,
  hasMounted: boolean
): boolean {
  if (!hasMounted) {
    return false;
  }
  return previousColor !== nextColor;
}
