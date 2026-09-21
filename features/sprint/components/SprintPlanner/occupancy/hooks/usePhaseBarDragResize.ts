import type { PositionPreview } from '../components/task-row/plan/occupancyPhaseBar.types';
import type { Task, TaskPosition } from '@/types';

import { useCallback, useRef, useState } from 'react';

import { getTaskPoints } from '@/features/task/utils/taskUtils';

import {
  cellToPosition,
  cellsToPositionDayMode,
} from '../components/task-row/plan/occupancyPhaseBarConstants';

import {
  applyPhaseBarLeftResizeMove,
  applyPhaseBarRightResizeMove,
  buildPhaseBarResizeSavedPosition,
  emitPhaseBarResizePreview,
} from './usePhaseBarDragResizeHelpers';

interface UsePhaseBarDragResizeParams {
  durationCells: number;
  endCell: number;
  externalDragStartCell?: number | null;
  isDayMode: boolean;
  position: TaskPosition;
  resolvedTotalParts: number;
  startCell: number;
  task: Task;
  onPreviewChange?: (preview: PositionPreview | null) => void;
  onSave?: (position: TaskPosition) => void;
}

export function usePhaseBarDragResize({
  position,
  task,
  isDayMode,
  durationCells,
  startCell,
  endCell,
  resolvedTotalParts,
  onSave,
  onPreviewChange,
  externalDragStartCell,
}: UsePhaseBarDragResizeParams) {
  const [dragPreview, setDragPreview] = useState<number | null>(null);
  const [isGrabbedForDrag, setIsGrabbedForDrag] = useState(false);
  const [resizePreview, setResizePreview] = useState<{
    startCell: number;
    duration: number;
  } | null>(null);
  const [resizeSide, setResizeSide] = useState<'left' | 'right' | null>(null);
  const [hoverLeft, setHoverLeft] = useState(false);
  const [hoverRight, setHoverRight] = useState(false);

  const previewRef = useRef<{ startCell: number; duration: number } | null>(
    null
  );

  const displayStartCell =
    resizePreview?.startCell ??
    dragPreview ??
    externalDragStartCell ??
    startCell;
  const displayDuration = resizePreview?.duration ?? durationCells;
  const displayEndCell = displayStartCell + displayDuration;

  const leftPercent = (displayStartCell / resolvedTotalParts) * 100;
  const rightPercent =
    ((resolvedTotalParts - displayEndCell) / resolvedTotalParts) * 100;

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const row = (e.target as HTMLElement).closest('tr') as HTMLElement;
      if (!row) return;

      setIsGrabbedForDrag(true);
      onPreviewChange?.({
        startDay: position.startDay,
        startPart: position.startPart,
        duration: position.duration,
      });

      const rowRect = row.getBoundingClientRect();
      const cellWidth = rowRect.width / resolvedTotalParts;
      const grabOffsetCells =
        (e.clientX - rowRect.left) / cellWidth - startCell;
      const maxStart =
        resolvedTotalParts - (isDayMode ? durationCells : position.duration);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const cursorCell = (moveEvent.clientX - rowRect.left) / cellWidth;
        let newStart = Math.round(cursorCell - grabOffsetCells);
        newStart = Math.max(0, Math.min(maxStart, newStart));
        setDragPreview(newStart);
        const dur = isDayMode ? durationCells : position.duration;
        const preview = { startCell: newStart, duration: dur };
        previewRef.current = preview;
        if (isDayMode) {
          const p = cellsToPositionDayMode(newStart, dur);
          onPreviewChange?.({
            startDay: p.startDay,
            startPart: p.startPart,
            duration: p.duration,
          });
        } else {
          const { startDay, startPart } = cellToPosition(newStart);
          onPreviewChange?.({ startDay, startPart, duration: position.duration });
        }
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        const dur = isDayMode ? durationCells : position.duration;
        const final = previewRef.current ?? { startCell, duration: dur };
        setDragPreview(null);
        setIsGrabbedForDrag(false);
        if (final.startCell !== startCell) {
          if (isDayMode) {
            const p = cellsToPositionDayMode(final.startCell, final.duration);
            onSave?.({
              ...position,
              ...p,
              plannedStartDay: p.startDay,
              plannedStartPart: p.startPart,
              plannedDuration: position.plannedDuration ?? getTaskPoints(task),
            });
          } else {
            const { startDay, startPart } = cellToPosition(final.startCell);
            onSave?.({
              ...position,
              startDay,
              startPart,
              plannedStartDay: startDay,
              plannedStartPart: startPart,
              plannedDuration:
                position.plannedDuration ?? getTaskPoints(task),
            });
          }
        }
        onPreviewChange?.(null);
      };

      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [
      task,
      position,
      startCell,
      durationCells,
      isDayMode,
      onSave,
      onPreviewChange,
      resolvedTotalParts,
    ]
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, side: 'left' | 'right') => {
      e.preventDefault();
      e.stopPropagation();
      setResizeSide(side);
      const row = (e.target as HTMLElement).closest('tr') as HTMLElement;
      if (!row) return;

      onPreviewChange?.({
        startDay: position.startDay,
        startPart: position.startPart,
        duration: position.duration,
      });

      const rowRect = row.getBoundingClientRect();
      const cellWidth = rowRect.width / resolvedTotalParts;
      const currentStart = startCell;
      const currentEnd = endCell;
      const grabEdgeCell = side === 'right' ? currentEnd : currentStart;
      const grabOffsetCells =
        (e.clientX - rowRect.left) / cellWidth - grabEdgeCell;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const cursorCell = (moveEvent.clientX - rowRect.left) / cellWidth;
        const preview =
          side === 'right'
            ? applyPhaseBarRightResizeMove({
                currentStart,
                cursorCell,
                grabOffsetCells,
                resolvedTotalParts,
              })
            : applyPhaseBarLeftResizeMove({
                currentEnd,
                cursorCell,
                grabOffsetCells,
              });
        setResizePreview(preview);
        previewRef.current = preview;
        emitPhaseBarResizePreview({
          isDayMode,
          onPreviewChange,
          startCell: preview.startCell,
          duration: preview.duration,
        });
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        setResizeSide(null);
        const final = previewRef.current ?? { startCell, duration: durationCells };
        setResizePreview(null);
        const changed =
          final.startCell !== startCell || final.duration !== durationCells;
        if (changed) {
          onSave?.(
            buildPhaseBarResizeSavedPosition({
              duration: final.duration,
              isDayMode,
              position,
              startCell: final.startCell,
            })
          );
        }
        onPreviewChange?.(null);
      };

      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [
      position,
      startCell,
      endCell,
      durationCells,
      isDayMode,
      onSave,
      onPreviewChange,
      resolvedTotalParts,
    ]
  );

  const isDragging = dragPreview !== null;
  const isResizing = resizeSide !== null;

  return {
    displayDuration,
    displayEndCell,
    displayStartCell,
    handleDragStart,
    handleResizeStart,
    hoverLeft,
    hoverRight,
    isDragging,
    isGrabbedForDrag,
    isResizing,
    leftPercent,
    rightPercent,
    setHoverLeft,
    setHoverRight,
    resizeSide,
  };
}
