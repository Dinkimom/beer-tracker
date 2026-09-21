/**
 * Цвет sticky-note на свимлейне.
 * Жёлтый — значение по умолчанию (в т.ч. для заметок без сохранённого цвета).
 */

export const STICKY_NOTE_COLORS = ['yellow', 'pink', 'green', 'blue', 'gray'] as const;

export type StickyNoteColor = (typeof STICKY_NOTE_COLORS)[number];

export const DEFAULT_STICKY_NOTE_COLOR: StickyNoteColor = 'yellow';

export const STICKY_NOTE_COLOR_LABEL_KEYS: Record<StickyNoteColor, string> = {
  blue: 'comments.colorBlue',
  gray: 'comments.colorGray',
  green: 'comments.colorGreen',
  pink: 'comments.colorPink',
  yellow: 'comments.colorYellow',
};

const STICKY_NOTE_COLOR_SET = new Set<string>(STICKY_NOTE_COLORS);

export function isStickyNoteColor(value: unknown): value is StickyNoteColor {
  return typeof value === 'string' && STICKY_NOTE_COLOR_SET.has(value);
}

export function parseStickyNoteColor(value: unknown): StickyNoteColor {
  return isStickyNoteColor(value) ? value : DEFAULT_STICKY_NOTE_COLOR;
}

/** Цвет из тела PUT: валидное значение или null (поле не трогаем). */
export function parseOptionalStickyNoteColor(value: unknown): StickyNoteColor | null {
  if (value == null) {
    return null;
  }
  return isStickyNoteColor(value) ? value : null;
}
