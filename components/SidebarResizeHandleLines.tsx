'use client';

import { sidebarResizeLineClass } from './sidebarResizeHandleLineClass';

interface SidebarResizeHandleLinesProps {
  emphasized?: boolean;
  linesCount: 2 | 3;
}

export function SidebarResizeHandleLines({
  emphasized = false,
  linesCount,
}: SidebarResizeHandleLinesProps) {
  const lineClass = sidebarResizeLineClass(linesCount, { emphasized });
  return (
    <>
      {Array.from({ length: linesCount }, (_, i) => (
        <div key={`line-${i}`} className={lineClass} />
      ))}
    </>
  );
}
