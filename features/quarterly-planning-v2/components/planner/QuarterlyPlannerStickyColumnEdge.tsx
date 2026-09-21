'use client';

import { ZIndex } from '@/constants';

export function QuarterlyPlannerStickyColumnEdge({
  zIndex = ZIndex.stickyLeftColumn + 1,
}: {
  zIndex?: number;
}) {
  return (
    <div
      aria-hidden
      className="absolute right-0 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600 pointer-events-none"
      style={{ zIndex }}
    />
  );
}
