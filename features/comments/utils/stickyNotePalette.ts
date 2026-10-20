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
    background: '#fdf0b5',
    border: '#f3e18f',
    text: '#422006',
    swatch: '#fbe07a',
  },
  pink: {
    background: '#fde0ec',
    border: '#f6cde0',
    text: '#500724',
    swatch: '#f9c6dd',
  },
  green: {
    background: '#daf5e2',
    border: '#c3ebcf',
    text: '#052e16',
    swatch: '#b2e8c4',
  },
  blue: {
    background: '#d9effb',
    border: '#c0e2f5',
    text: '#082f49',
    swatch: '#aedcf6',
  },
  gray: {
    background: '#f2f3f5',
    border: '#e3e5e9',
    text: '#111827',
    swatch: '#dadde3',
  },
};

/**
 * Тёмная тема: тот же оттенок, что у светлого листа, ниже по светлоте.
 * Насыщенность снижена против неона, но без серой примеси — иначе краска мутнеет.
 * Чернила тёмные на светлой краске и светлые там, где бумага сама тёмная.
 */
const STICKY_NOTE_PAINT_DARK: Record<StickyNoteColor, StickyNotePaint> = {
  yellow: {
    background: '#d6b73a',
    border: '#b99c2a',
    text: '#2a1604',
    swatch: '#e6c440',
  },
  pink: {
    background: '#a64474',
    border: '#8c3962',
    text: '#fff4f8',
    swatch: '#bf4f86',
  },
  green: {
    background: '#46ad6c',
    border: '#3a925a',
    text: '#042e16',
    swatch: '#4fc279',
  },
  blue: {
    background: '#3f9ccc',
    border: '#3484ad',
    text: '#062033',
    swatch: '#4aaee0',
  },
  gray: {
    background: '#959dab',
    border: '#818a99',
    text: '#111827',
    swatch: '#a3abb8',
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
