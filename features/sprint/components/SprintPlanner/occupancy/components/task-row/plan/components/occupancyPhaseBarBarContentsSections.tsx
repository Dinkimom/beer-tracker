import type { ReactNode } from 'react';

import { OccupancyResizeHandle } from './OccupancyResizeHandle';

interface OccupancyPhaseBarResizeHandlesProps {
  compactRowMode: boolean;
  disableDragAndResize: boolean;
  handleColors: {
    bg: string;
    bgDark: string;
    hoverBg: string;
    hoverBgDark: string;
    line: string;
    lineDark: string;
  };
  hideResizeHandles?: boolean;
  hoverLeft: boolean;
  hoverRight: boolean;
  readonly: boolean;
  resizeSide: 'left' | 'right' | null;
  handleResizeStart: (e: React.MouseEvent, side: 'left' | 'right') => void;
  setHoverLeft: (v: boolean) => void;
  setHoverRight: (v: boolean) => void;
}

export function OccupancyPhaseBarResizeHandles({
  compactRowMode,
  disableDragAndResize,
  handleColors,
  handleResizeStart,
  hideResizeHandles,
  hoverLeft,
  hoverRight,
  readonly,
  resizeSide,
  setHoverLeft,
  setHoverRight,
}: OccupancyPhaseBarResizeHandlesProps): ReactNode {
  if (disableDragAndResize || readonly || hideResizeHandles) return null;
  return (
    <>
      <OccupancyResizeHandle
        compact={compactRowMode}
        handleColors={handleColors}
        isActive={resizeSide === 'left'}
        isHovering={hoverLeft}
        side="left"
        onMouseDown={(e) => {
          e.stopPropagation();
          handleResizeStart(e, 'left');
        }}
        onMouseEnter={() => setHoverLeft(true)}
        onMouseLeave={() => setHoverLeft(false)}
      />
      <OccupancyResizeHandle
        compact={compactRowMode}
        handleColors={handleColors}
        isActive={resizeSide === 'right'}
        isHovering={hoverRight}
        side="right"
        onMouseDown={(e) => {
          e.stopPropagation();
          handleResizeStart(e, 'right');
        }}
        onMouseEnter={() => setHoverRight(true)}
        onMouseLeave={() => setHoverRight(false)}
      />
    </>
  );
}
