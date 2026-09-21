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
    background: '#fef08a',
    border: '#f3e27a',
    text: '#422006',
    swatch: '#fde047',
  },
  pink: {
    background: '#fbcfe8',
    border: '#f3b7d6',
    text: '#500724',
    swatch: '#f9a8d4',
  },
  green: {
    background: '#bbf7d0',
    border: '#9ee8b8',
    text: '#052e16',
    swatch: '#86efac',
  },
  blue: {
    background: '#bae6fd',
    border: '#9ad6f5',
    text: '#082f49',
    swatch: '#7dd3fc',
  },
  gray: {
    background: '#e5e7eb',
    border: '#d1d5db',
    text: '#111827',
    swatch: '#d1d5db',
  },
};

const STICKY_NOTE_PAINT_DARK: Record<StickyNoteColor, StickyNotePaint> = {
  yellow: {
    background: '#a16207',
    border: '#eab308',
    text: '#fefce8',
    swatch: '#ca8a04',
  },
  pink: {
    background: '#be185d',
    border: '#ec4899',
    text: '#fdf2f8',
    swatch: '#db2777',
  },
  green: {
    background: '#15803d',
    border: '#22c55e',
    text: '#f0fdf4',
    swatch: '#16a34a',
  },
  blue: {
    background: '#0369a1',
    border: '#0ea5e9',
    text: '#f0f9ff',
    swatch: '#0284c7',
  },
  gray: {
    background: '#4b5563',
    border: '#9ca3af',
    text: '#f9fafb',
    swatch: '#6b7280',
  },
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

/**
 * Плюс на превью: оттенок выбранного цвета, контрастный к бумаге.
 * Берём swatch соседней темы — на светлой бумаге тёмный чип, на тёмной светлый.
 */
export function getStickyNoteGhostGlyphColor(
  color?: StickyNoteColorInput,
  isDark = false
): string {
  return getStickyNotePaint(color, !isDark).swatch;
}

/** Превью постановки заметки: бумага выбранного цвета и пунктир, без скругления. */
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
    borderWidth: 2,
    color: getStickyNoteGhostGlyphColor(color, isDark),
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
 * Линии грипа — заливка соседней темы, чтобы оттенок совпадал с заметкой и был контрастен.
 */
export function getStickyNoteResizeHandlePaint(
  color?: StickyNoteColorInput,
  isDark = false
): StickyNoteResizeHandlePaint {
  const paint = getStickyNotePaint(color, isDark);
  const contrastFill = getStickyNotePaint(color, !isDark).background;
  return {
    activeBackground: hexToRgba(paint.border, 0.6),
    hoverBackground: hexToRgba(paint.border, 0.2),
    line: contrastFill,
  };
}
