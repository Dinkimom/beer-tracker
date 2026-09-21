'use client';

import { SidebarResizeHandleLines } from './SidebarResizeHandleLines';
import { sidebarResizeInlineIndicatorOpacityClass } from './sidebarResizeInlineIndicatorOpacityClass';

interface SidebarResizeInlineIndicatorProps {
  /** Drag в процессе — показать индикатор даже без hover. */
  isActive?: boolean;
  linesCount: 2 | 3;
  /** Видима только на hover группы / при active (resize). */
  revealOnHover?: boolean;
  side: 'left' | 'right';
  translateClass: string;
}

export function SidebarResizeInlineIndicator({
  side,
  translateClass,
  linesCount,
  revealOnHover = false,
  isActive = false,
}: SidebarResizeInlineIndicatorProps) {
  const horizontalClass = side === 'left' ? 'left-1/2' : 'right-1/2';
  const opacityClass = sidebarResizeInlineIndicatorOpacityClass(revealOnHover, isActive);
  return (
    <div
      className={`absolute ${horizontalClass} top-1/2 ${translateClass} -translate-y-1/2 flex flex-col gap-1 ${opacityClass} transition-opacity duration-200 cursor-col-resize pointer-events-none`}
    >
      <SidebarResizeHandleLines emphasized={isActive} linesCount={linesCount} />
    </div>
  );
}
