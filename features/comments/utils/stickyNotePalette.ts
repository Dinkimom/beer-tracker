/**
 * Конкретные цвета sticky-note (hex), чтобы карточка красилась без зависимости от Tailwind JIT.
 */

import type { CSSProperties } from 'react';

import { parseStickyNoteColor, type StickyNoteColor } from '@/lib/comments/stickyNoteColor';

interface StickyNotePaint {
  background: string;
  border: string;
  swatch: string;
  text: string;
}

const STICKY_NOTE_PAINT_LIGHT: Record<StickyNoteColor, StickyNotePaint> = {
  yellow: {
    background: '#ffe56a',
    border: '#f4d454',
    text: '#422006',
    swatch: '#ffd84a',
  },
  pink: {
    background: '#ffd4ea',
    border: '#f5c0dc',
    text: '#500724',
    swatch: '#ffc0e0',
  },
  green: {
    background: '#c8f7d6',
    border: '#aeeec4',
    text: '#052e16',
    swatch: '#a6efbe',
  },
  blue: {
    background: '#c5ecff',
    border: '#aadff8',
    text: '#082f49',
    swatch: '#96d8fb',
  },
  gray: {
    background: '#eef0f3',
    border: '#e0e3e8',
    text: '#111827',
    swatch: '#d8dce2',
  },
};

/**
 * Тёмная тема: тот же чистый оттенок, что у светлого листа, но ниже по светлоте.
 * Насыщенность не снижаем — иначе жёлтый уходит в оливково-коричневый.
 * Чернила тёмные на яркой краске и светлые там, где бумага сама тёмная.
 */
const STICKY_NOTE_PAINT_DARK: Record<StickyNoteColor, StickyNotePaint> = {
  yellow: {
    background: '#e0bb00',
    border: '#bd9d00',
    text: '#2a1604',
    swatch: '#ffd500',
  },
  pink: {
    background: '#b6206b',
    border: '#981b59',
    text: '#fff4f8',
    swatch: '#d5207a',
  },
  green: {
    background: '#28c361',
    border: '#22a552',
    text: '#042e16',
    swatch: '#2fda6e',
  },
  blue: {
    background: '#14a7eb',
    border: '#128fca',
    text: '#062033',
    swatch: '#2cb3f2',
  },
  gray: {
    background: '#929baa',
    border: '#7e899a',
    text: '#111827',
    swatch: '#a0aaba',
  },
};

/** Насыщенный оттенок для плюса и грипа: на светлой бумаге бледный swatch теряется. */
const STICKY_NOTE_MARK: Record<StickyNoteColor, string> = {
  yellow: '#a16207',
  pink: '#be185d',
  green: '#15803d',
  blue: '#0369a1',
  gray: '#4b5563',
};

interface StickyNoteResizeHandlePaint {
  activeBackground: string;
  hoverBackground: string;
  line: string;
}

type StickyNoteColorInput = StickyNoteColor | string | null;

export function getStickyNotePaint(
  color?: StickyNoteColorInput,
  isDark = false
): StickyNotePaint {
  const key = parseStickyNoteColor(color);
  return isDark ? STICKY_NOTE_PAINT_DARK[key] : STICKY_NOTE_PAINT_LIGHT[key];
}

export function getStickyNoteCardStyle(
  color?: StickyNoteColorInput,
  isDark = false
): CSSProperties {
  const paint = getStickyNotePaint(color, isDark);
  return {
    backgroundColor: paint.background,
    borderColor: paint.border,
    borderRadius: 0,
    borderStyle: 'solid',
    borderWidth: 1,
    color: paint.text,
  };
}

export function getStickyNoteSwatchStyle(color: StickyNoteColor, isDark = false): CSSProperties {
  const paint = getStickyNotePaint(color, isDark);
  return { backgroundColor: paint.swatch };
}

/** Плюс на превью: насыщенный оттенок листа, читаемый на светлой бумаге в обеих темах. */
export function getStickyNoteGhostGlyphColor(color?: StickyNoteColorInput): string {
  return STICKY_NOTE_MARK[parseStickyNoteColor(color)];
}

/** Превью постановки заметки: бумага выбранного цвета и пунктир той же толщины, что у карточки. */
export function getStickyNoteDashedGhostStyle(
  color?: StickyNoteColorInput,
  isDark = false
): CSSProperties {
  const paint = getStickyNotePaint(color, isDark);
  return {
    backgroundColor: hexToRgba(paint.background, 0.8),
    borderColor: paint.border,
    borderRadius: 0,
    borderStyle: 'dashed',
    borderWidth: 1,
    color: isDark ? paint.text : getStickyNoteGhostGlyphColor(color),
  };
}

/** Заметка агента до апрува: та же бумага, пунктирная рамка. */
export function getStickyNotePendingApprovalCardStyle(
  color?: StickyNoteColorInput,
  isDark = false
): CSSProperties {
  const style = getStickyNoteCardStyle(color, isDark);
  return {
    ...style,
    borderStyle: 'dashed',
    borderWidth: 2,
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Цвета рукоятки ресайза: та же палитра, что у карточки (без Tailwind JIT).
 * Фон — акцент бордера с прозрачностью, как /60 и /20 у карточек задач.
 * Линии грипа — насыщенный оттенок листа, чтобы они читались на светлой бумаге.
 */
export function getStickyNoteResizeHandlePaint(
  color?: StickyNoteColorInput,
  isDark = false
): StickyNoteResizeHandlePaint {
  const paint = getStickyNotePaint(color, isDark);
  return {
    activeBackground: hexToRgba(paint.border, 0.6),
    hoverBackground: hexToRgba(paint.border, 0.2),
    line: isDark ? paint.text : STICKY_NOTE_MARK[parseStickyNoteColor(color)],
  };
}
