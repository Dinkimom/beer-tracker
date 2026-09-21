import type { CSSProperties } from 'react';

import { buildFixedSidebarHandleStyle } from './sidebarResizeHandlePosition';

export function resolveFixedSidebarHandleStyles(
  handlePosition: { centerX: number; left: number },
  columnTop: number | undefined,
  columnHeight: number | undefined,
  handleWidth: number
): { handlePositionStyle: CSSProperties } {
  return {
    handlePositionStyle: buildFixedSidebarHandleStyle(
      handlePosition.left,
      columnTop,
      columnHeight,
      handleWidth
    ),
  };
}
