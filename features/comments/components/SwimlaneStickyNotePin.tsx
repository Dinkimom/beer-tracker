'use client';

/**
 * Загнутый уголок стикера — та же метафора, что у Lucide sticky-note.
 * Не интерактивен.
 */

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';

import { ZIndex } from '@/constants';
import { getStickyNotePaint } from '@/features/comments/utils/stickyNotePalette';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
import { parseStickyNoteColor } from '@/lib/comments/stickyNoteColor';

interface SwimlaneStickyNotePinProps {
  color?: StickyNoteColor | string | null;
}

export function SwimlaneStickyNotePin({ color }: SwimlaneStickyNotePinProps) {
  const isDark = useDocumentDarkClass();
  const paint = getStickyNotePaint(parseStickyNoteColor(color), isDark);
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute right-0 top-0 h-3.5 w-3.5"
      style={{ zIndex: ZIndex.contentInteractive }}
    >
      <svg className="h-full w-full" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0v14L0 0h14z" fill={paint.text} opacity={isDark ? 0.22 : 0.14} />
      </svg>
    </span>
  );
}
