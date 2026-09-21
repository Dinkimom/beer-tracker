import type { CSSProperties } from 'react';

export function computeSidebarHandlePosition(
  side: 'left' | 'right',
  columnLeft: number,
  columnWidth: number | undefined,
  handleWidth: number
): { centerX: number; left: number } {
  if (side === 'right' && columnWidth !== undefined) {
    return {
      left: columnLeft + columnWidth - handleWidth,
      centerX: columnLeft + columnWidth - handleWidth / 2,
    };
  }
  return {
    left: columnLeft,
    centerX: columnLeft + handleWidth / 2,
  };
}

export function buildFixedSidebarHandleStyle(
  handleLeft: number,
  columnTop: number | undefined,
  columnHeight: number | undefined,
  handleWidth: number
): CSSProperties {
  if (columnTop !== undefined && columnHeight !== undefined) {
    return {
      position: 'fixed',
      left: `${handleLeft}px`,
      top: `${columnTop}px`,
      height: `${columnHeight}px`,
      width: `${handleWidth}px`,
    };
  }
  return {
    position: 'fixed',
    left: `${handleLeft}px`,
    top: '0',
    bottom: '0',
    width: `${handleWidth}px`,
  };
}
