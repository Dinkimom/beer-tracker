'use client';

import { ZIndex } from '@/constants';

interface StickyTaskColumnRightEdgeProps {
  /** По умолчанию — выше фаз строки; в шапке передайте `ZIndex.stickyMainHeader + 1`. */
  zIndex?: number;
}

/** Вертикальная граница между липкой колонкой задач и таймлайном. */
export function StickyTaskColumnRightEdge({
  zIndex = ZIndex.stickyLeftColumn + 1,
}: StickyTaskColumnRightEdgeProps) {
  return (
    <div
      aria-hidden
      className="absolute right-0 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600 pointer-events-none"
      style={{ zIndex }}
    />
  );
}
