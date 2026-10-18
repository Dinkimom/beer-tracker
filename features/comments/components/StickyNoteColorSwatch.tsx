'use client';

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { CSSProperties } from 'react';

import { getStickyNoteSwatchStyle } from '@/features/comments/utils/stickyNotePalette';

interface StickyNoteColorSwatchProps {
  color: StickyNoteColor;
  isDark?: boolean;
  /** Диаметр цветного кружка. */
  size?: number;
}

const DEFAULT_SIZE = 16;

function colorDotStyle(color: StickyNoteColor, isDark: boolean, size: number): CSSProperties {
  return {
    ...getStickyNoteSwatchStyle(color, isDark),
    height: size,
    width: size,
  };
}

/** Метка цвета в пикере: кружок бумаги. */
export function StickyNoteColorSwatch({
  color,
  isDark = false,
  size = DEFAULT_SIZE,
}: StickyNoteColorSwatchProps) {
  return (
    <span
      aria-hidden
      className="shrink-0 rounded-full border border-black/15 shadow-sm dark:border-white/20"
      style={colorDotStyle(color, isDark, size)}
    />
  );
}
