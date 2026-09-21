import type { Task, Developer, TaskPosition } from '@/types';

import { useCallback } from 'react';

import { handleOccupancyEmptyCellClickAction } from './useOccupancyEmptyCellClickAction';

export function useOccupancyEmptyCellClick({
  developers,
  onOpenAssigneePicker,
  onPositionSave,
}: {
  developers: Developer[];
  onOpenAssigneePicker?: (data: {
    anchorRect: DOMRect;
    position: TaskPosition;
    task: Task;
    taskName: string;
  }) => void;
  onPositionSave?: (position: TaskPosition, isQa: boolean, devTaskKey?: string) => Promise<void> | void;
}) {
  const handleEmptyCellClick = useCallback(
    (
      targetTask: Task,
      dayIndex: number,
      partIndex: number,
      cellElement: HTMLElement,
      getAnchorRect?: (cell: HTMLElement) => DOMRect
    ) => {
      handleOccupancyEmptyCellClickAction({
        cellElement,
        dayIndex,
        developers,
        getAnchorRect,
        onOpenAssigneePicker,
        onPositionSave,
        partIndex,
        targetTask,
      });
    },
    [developers, onOpenAssigneePicker, onPositionSave]
  );

  return { handleEmptyCellClick };
}
