/**
 * Движение листа заметки: черновик «ложится» на доску, правка — лист «прижимается»,
 * новая заметка — «приклеивается» из положения черновика. Играет по id карточки,
 * поэтому работает и для карточки, которая смонтируется позже вызова.
 * Класс снимает TaskBar по `animationend`; таймер — только страховка, если карточка не появилась.
 */

export type StickyNoteSaveMotion = 'place' | 'press' | 'stick';

const STICKY_NOTE_SAVE_MOTION_FALLBACK_MS = 1500;

const MOTION_CLASS: Record<StickyNoteSaveMotion, string> = {
  place: 'sticky-note-place',
  press: 'sticky-note-save-press',
  stick: 'sticky-note-save-stick',
};

/** Keyframes, по завершении которых движение считается сыгранным (flash — reduced motion). */
const MOTION_KEYFRAMES = new Set([
  'sticky-note-place',
  'sticky-note-save-press',
  'sticky-note-save-stick',
  'sticky-note-save-flash',
]);

const playing = new Map<string, StickyNoteSaveMotion>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let snapshot: ReadonlyMap<string, StickyNoteSaveMotion> = new Map();
const emptySnapshot: ReadonlyMap<string, StickyNoteSaveMotion> = new Map();
const listeners = new Set<() => void>();

function emit(): void {
  snapshot = new Map(playing);
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeStickyNoteSaveMotion(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStickyNoteSaveMotionSnapshot(): ReadonlyMap<string, StickyNoteSaveMotion> {
  return snapshot;
}

export function getStickyNoteSaveMotionServerSnapshot(): ReadonlyMap<string, StickyNoteSaveMotion> {
  return emptySnapshot;
}

function stopStickyNoteSaveMotion(taskId: string): void {
  const timer = timers.get(taskId);
  if (timer != null) {
    globalThis.clearTimeout(timer);
    timers.delete(taskId);
  }
  if (playing.delete(taskId)) {
    emit();
  }
}

/**
 * Запустить (или перезапустить) отклик на сохранение. При reduced motion CSS
 * подменяет движение короткой подсветкой рамки — поэтому играем всегда.
 */
export function playStickyNoteSaveMotion(taskId: string, motion: StickyNoteSaveMotion): void {
  stopStickyNoteSaveMotion(taskId);
  playing.set(taskId, motion);
  emit();
  timers.set(
    taskId,
    globalThis.setTimeout(() => {
      stopStickyNoteSaveMotion(taskId);
    }, STICKY_NOTE_SAVE_MOTION_FALLBACK_MS)
  );
}

/** `animationend` листа: снять класс, как только keyframes движения доиграли. */
export function finishStickyNoteSaveMotion(taskId: string, animationName: string): void {
  if (MOTION_KEYFRAMES.has(animationName)) {
    stopStickyNoteSaveMotion(taskId);
  }
}

export function stickyNoteSaveMotionClassName(
  isStickyNote: boolean,
  motion: StickyNoteSaveMotion | undefined
): string {
  return isStickyNote && motion ? ` ${MOTION_CLASS[motion]}` : '';
}
