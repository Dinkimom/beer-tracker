import type { SprintPresenceViewer } from './sprintRealtimeTypes';

import { sprintPresenceViewerReactKey } from './sprintPresenceCollapse';

/** Палитра `--presence-color-N` в globals.css (светлая и тёмная тема). */
export const SPRINT_PRESENCE_COLOR_COUNT = 8;

/** CSS-переменная цвета участника на карточке: обводка чужого жеста, вспышка перехода. */
export const SPRINT_PRESENCE_COLOR_CSS_VAR = '--sprint-presence-color';

/** FNV-1a: стабильный слот для одного и того же человека между сессиями. */
function hashPresenceKey(key: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function firstFreeSlot(preferred: number, taken: ReadonlySet<number>): number {
  for (let step = 0; step < SPRINT_PRESENCE_COLOR_COUNT; step += 1) {
    const slot = (preferred + step) % SPRINT_PRESENCE_COLOR_COUNT;
    if (!taken.has(slot)) {
      return slot;
    }
  }
  return preferred;
}

/**
 * Слот палитры на каждого участника доски. Свой цвет — из хэша ключа; при коллизии
 * берётся следующий свободный. Ключи сортируются, поэтому у всех клиентов с одним
 * снимком presence раскраска совпадает.
 */
export function sprintPresenceColorSlots(
  viewers: readonly SprintPresenceViewer[]
): ReadonlyMap<string, number> {
  const keys = [...new Set(viewers.map(sprintPresenceViewerReactKey))].sort();
  const taken = new Set<number>();
  const slots = new Map<string, number>();
  for (const key of keys) {
    const slot = firstFreeSlot(hashPresenceKey(key) % SPRINT_PRESENCE_COLOR_COUNT, taken);
    taken.add(slot);
    slots.set(key, slot);
  }
  return slots;
}

export function sprintPresenceViewerColor(
  slots: ReadonlyMap<string, number>,
  viewer: SprintPresenceViewer
): string {
  const key = sprintPresenceViewerReactKey(viewer);
  const slot = slots.get(key) ?? hashPresenceKey(key) % SPRINT_PRESENCE_COLOR_COUNT;
  return `var(--presence-color-${slot + 1})`;
}
