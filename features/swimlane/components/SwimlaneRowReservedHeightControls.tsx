'use client';

import { useCallback, useRef, useState } from 'react';

import { resolveSwimlaneRowResizeHighlightStripClass } from '@/features/swimlane/components/SwimlaneRowBorderResizeHandle';
import { useSwimlaneRowBorderResize } from '@/features/swimlane/hooks/useSwimlaneRowBorderResize';
import {
  readSwimlaneReservedTaskLayersForAssignee,
  resolveSwimlaneOneCardHeightPx,
} from '@/features/swimlane/utils/swimlaneRowReservedLayers';
import { useSwimlaneRowReservedLayersStorage } from '@/hooks/useLocalStorage';

interface UseSwimlaneRowReservedHeightControlsInput {
  assigneeId: string;
  contentMaxTaskLayers: number;
  selectedSprintId?: number | null;
  showParent: boolean;
  onPreviewLayersChange: (layers: number | null) => void;
}

interface SwimlaneRowReservedHeightControlsProps {
  isResizing: boolean;
  /**
   * Позиция визуальной полоски по вертикали (низ всей строки: задачи + факт + календарь).
   * Измерение полосы задач остаётся по `taskBandHeightPx`.
   * Захват и курсор ресайза — только на колонке исполнителя/фичи.
   */
  resizeHandleTopPx: number;
  taskBandHeightPx: number;
  taskBandMeasureRef: React.RefObject<HTMLDivElement | null>;
}

export function useSwimlaneRowReservedHeightControls({
  assigneeId,
  contentMaxTaskLayers,
  onPreviewLayersChange,
  selectedSprintId,
  showParent,
}: UseSwimlaneRowReservedHeightControlsInput) {
  const taskBandMeasureRef = useRef<HTMLDivElement>(null);
  const [isBorderHovered, setIsBorderHovered] = useState(false);
  const handleBorderMouseEnter = useCallback(() => {
    setIsBorderHovered(true);
  }, []);
  const handleBorderMouseLeave = useCallback(() => {
    setIsBorderHovered(false);
  }, []);
  const [rowReservedLayersByAssignee, setRowReservedLayersByAssignee] =
    useSwimlaneRowReservedLayersStorage(selectedSprintId);
  const storedReservedTaskLayers = readSwimlaneReservedTaskLayersForAssignee(
    rowReservedLayersByAssignee,
    assigneeId
  );
  const oneCardHeightPx = resolveSwimlaneOneCardHeightPx(showParent);

  const commitReservedTaskLayers = useCallback(
    (layers: number | null) => {
      setRowReservedLayersByAssignee((prev) => {
        const next = { ...prev };
        if (layers == null) {
          delete next[assigneeId];
        } else {
          next[assigneeId] = layers;
        }
        return next;
      });
    },
    [assigneeId, setRowReservedLayersByAssignee]
  );

  const rowBorderResize = useSwimlaneRowBorderResize({
    bandElementRef: taskBandMeasureRef,
    contentMaxTaskLayers,
    oneCardHeightPx,
    onPreviewLayersChange,
    onReservedTaskLayersCommit: commitReservedTaskLayers,
    reservedTaskLayers: storedReservedTaskLayers,
  });

  return {
    handleBorderMouseEnter,
    handleBorderMouseLeave,
    handleResizeStart: rowBorderResize.handleResizeStart,
    isBorderHovered,
    isResizing: rowBorderResize.isResizing,
    taskBandMeasureRef,
  };
}

/**
 * Якорь измерения полосы задач и визуальная полоска на таймлайне во время ресайза.
 * Интерактивная рукоятка — только в `SwimlaneRowBorderResizeHandle` (ячейка исполнителя/фичи).
 */
export function SwimlaneRowReservedHeightControls({
  isResizing,
  resizeHandleTopPx,
  taskBandHeightPx,
  taskBandMeasureRef,
}: SwimlaneRowReservedHeightControlsProps) {
  return (
    <>
      <div
        ref={taskBandMeasureRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{ height: `${taskBandHeightPx}px` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 z-10"
        style={{ top: `${resizeHandleTopPx}px` }}
      >
        <div className="relative h-4 w-full -translate-y-full">
          <div className={resolveSwimlaneRowResizeHighlightStripClass(isResizing, false)} />
        </div>
      </div>
    </>
  );
}

export function useSwimlaneRowReservedLayersForAssignee(
  assigneeId: string,
  selectedSprintId?: number | null
): number | undefined {
  const [rowReservedLayersByAssignee] = useSwimlaneRowReservedLayersStorage(selectedSprintId);
  return readSwimlaneReservedTaskLayersForAssignee(rowReservedLayersByAssignee, assigneeId);
}
