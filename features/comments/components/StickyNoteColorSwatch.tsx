'use client';

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';

import { getStickyNotePaint } from '@/features/comments/utils/stickyNotePalette';

interface StickyNoteColorSwatchProps {
  color: StickyNoteColor;
  isDark?: boolean;
  /** Сторона листа. */
  size?: number;
}

const DEFAULT_SIZE = 18;

/**
 * Метка цвета в пикере: мини-лист заметки с загнутым уголком.
 * Бумага и уголок — те же `background` / `border`, что у карточки, чтобы пикер показывал результат.
 * Контур нейтральный: светлая бумага иначе теряется на белом меню.
 */
export function StickyNoteColorSwatch({
  color,
  isDark = false,
  size = DEFAULT_SIZE,
}: StickyNoteColorSwatchProps) {
  const paint = getStickyNotePaint(color, isDark);
  return (
    <svg
      aria-hidden
      className="shrink-0 text-black/20 drop-shadow-sm dark:text-white/25"
      height={size}
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1.5 1.5H10.5L14.5 5.5V14.5H1.5Z"
        fill={paint.background}
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M10.5 1.5V5.5H14.5Z"
        fill={paint.border}
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
