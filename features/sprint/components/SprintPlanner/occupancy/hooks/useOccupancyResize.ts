import { useEffect, useRef } from 'react';

import { useResize } from '@/features/sidebar/hooks/useResize';
import { useOccupancyTaskColumnWidthStorage } from '@/hooks/useLocalStorage';

export function useOccupancyResize() {
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const [taskColumnWidth, setTaskColumnWidth] = useOccupancyTaskColumnWidthStorage(280);

  const TASK_COLUMN_MIN_WIDTH_PX = 270;

  const { isResizing, setIsResizing } = useResize({
    calculateValue: (e: MouseEvent) => {
      const container = tableScrollRef.current;
      if (!container) return taskColumnWidth;
      const rect = container.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      return Math.max(TASK_COLUMN_MIN_WIDTH_PX, Math.min(500, newWidth));
    },
    onValueChange: (width) => setTaskColumnWidth(width),
    min: TASK_COLUMN_MIN_WIDTH_PX,
    max: 500,
    clamp: true,
  });

  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      return () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing]);

  return {
    isResizing,
    setIsResizing,
    tableScrollRef,
    taskColumnWidth: Math.max(TASK_COLUMN_MIN_WIDTH_PX, taskColumnWidth),
  };
}
