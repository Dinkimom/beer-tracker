'use client';

import { useCallback, useEffect, useState } from 'react';

import { clampParticipantsColumnWidth } from '../utils/participantsColumnWidth';

export function useParticipantsColumnWidthResize(
  columnWidth: number,
  onWidthChange?: (width: number) => void
): {
  isResizing: boolean;
  onResizeMouseDown: (event: React.MouseEvent) => void;
} {
  const [resizeStart, setResizeStart] = useState<{ width: number; x: number } | null>(null);

  const handleResizeMove = useCallback(
    (event: MouseEvent) => {
      if (!resizeStart || !onWidthChange) return;
      const delta = event.clientX - resizeStart.x;
      onWidthChange(clampParticipantsColumnWidth(resizeStart.width + delta));
    },
    [onWidthChange, resizeStart]
  );

  const handleResizeEnd = useCallback(() => {
    setResizeStart(null);
  }, []);

  useEffect(() => {
    if (!resizeStart) return;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [handleResizeEnd, handleResizeMove, resizeStart]);

  const onResizeMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (!onWidthChange) return;
      event.preventDefault();
      event.stopPropagation();
      setResizeStart({ x: event.clientX, width: columnWidth });
    },
    [columnWidth, onWidthChange]
  );

  return {
    isResizing: resizeStart !== null,
    onResizeMouseDown,
  };
}
