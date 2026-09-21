'use client';

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';

import { getStickyNotePaint } from '@/features/comments/utils/stickyNotePalette';
import { parseStickyNoteColor } from '@/lib/comments/stickyNoteColor';

interface StickyNoteToolIconProps {
  className?: string;
  color?: StickyNoteColor | string | null;
  isDark?: boolean;
  variant?: 'filled' | 'outline';
}

export function StickyNoteToolIcon({
  className,
  color,
  isDark = false,
  variant = 'filled',
}: StickyNoteToolIconProps) {
  const paint = getStickyNotePaint(parseStickyNoteColor(color), isDark);
  const outline = variant === 'outline';
  const stroke = !outline && isDark ? '#fff' : 'currentColor';
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"
        fill={outline ? 'none' : paint.swatch}
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M15 3v4a2 2 0 0 0 2 2h4"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
