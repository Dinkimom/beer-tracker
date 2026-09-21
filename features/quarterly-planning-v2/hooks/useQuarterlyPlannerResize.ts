import { useEffect, useRef } from 'react';

import { useResize } from '@/features/sidebar/hooks/useResize';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const TASK_COLUMN_MIN_WIDTH_PX = 270;
const TASK_COLUMN_MAX_WIDTH_PX = 500;
const STORAGE_KEY = 'quarterly-v2-planner-task-column-width';

export function useQuarterlyPlannerResize() {
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const [taskColumnWidth, setTaskColumnWidth] = useLocalStorage(STORAGE_KEY, 280);

  const { isResizing, setIsResizing } = useResize({
    calculateValue: (e: MouseEvent) => {
      const container = tableScrollRef.current;
      if (!container) return taskColumnWidth;
      const rect = container.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      return Math.max(TASK_COLUMN_MIN_WIDTH_PX, Math.min(TASK_COLUMN_MAX_WIDTH_PX, newWidth));
    },
    onValueChange: (width) => setTaskColumnWidth(width),
    min: TASK_COLUMN_MIN_WIDTH_PX,
    max: TASK_COLUMN_MAX_WIDTH_PX,
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
