'use client';

import { resolveFixedSidebarHandleStyles } from './sidebarResizeHandleFixedStyles';
import { computeSidebarHandlePosition } from './sidebarResizeHandlePosition';

const SIDEBAR_HANDLE_WIDTH_PX = 6;

export function useSidebarResizeHandleLayout(params: {
  columnHeight?: number;
  columnLeft?: number;
  columnTop?: number;
  columnWidth?: number;
  fixedIconInViewport: boolean;
  side: 'left' | 'right';
}): {
  handlePositionStyle: React.CSSProperties | undefined;
  showInlineIndicator: boolean;
  translateClass: string;
} {
  const handlePosition =
    params.fixedIconInViewport && params.columnLeft !== undefined
      ? computeSidebarHandlePosition(
          params.side,
          params.columnLeft,
          params.columnWidth,
          SIDEBAR_HANDLE_WIDTH_PX
        )
      : null;

  const fixedStyles = handlePosition
    ? resolveFixedSidebarHandleStyles(
        handlePosition,
        params.columnTop,
        params.columnHeight,
        SIDEBAR_HANDLE_WIDTH_PX
      )
    : null;

  const translateClass = params.side === 'left' ? '-translate-x-1/2' : 'translate-x-1/2';

  return {
    handlePositionStyle: fixedStyles?.handlePositionStyle,
    showInlineIndicator: true,
    translateClass,
  };
}
