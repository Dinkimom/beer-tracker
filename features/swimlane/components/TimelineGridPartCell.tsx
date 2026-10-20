import type { MouseEvent } from 'react';

import { getPartsPerDay } from '@/constants';
import { DroppableCell } from '@/features/swimlane/components/DroppableCell';
import {
  collectOccupiedLayersForCellRange,
  resolveSwimlaneQuickAddLayerBand,
} from '@/features/swimlane/utils/swimlaneCellOccupancy';
import { getPartStatus } from '@/utils/dateUtils';

function createQuickAddHoverHandler(
  onQuickAddHoverPreviewChange:
    | ((preview: { cellIndex: number; layer: number; span: number } | null) => void)
    | undefined,
  cellStart: number,
  band: { layer: number; span: number }
) {
  return (hovered: boolean) => {
    onQuickAddHoverPreviewChange?.(
      hovered ? { cellIndex: cellStart, layer: band.layer, span: band.span } : null
    );
  };
}

function createQuickAddTaskHandler(
  onQuickAddTask: (payload: { assigneeId: string; day: number; part: number }) => void,
  developerId: string,
  dayIndex: number,
  partIndex: number
) {
  return (event: MouseEvent) => {
    event.stopPropagation();
    onQuickAddTask({
      assigneeId: developerId,
      day: dayIndex,
      part: partIndex,
    });
  };
}

export function TimelineGridPartCell(props: {
  dayCount: number;
  dayIndex: number;
  developerId: string;
  hasTaskOverlaps?: boolean;
  hidePartDivider?: boolean;
  isDraggingTask: boolean;
  isLinking?: boolean;
  maxTaskLayers?: number;
  occupiedLayersByCell?: Map<number, Set<number>>;
  partIndex: number;
  quickAddClipHeight?: number;
  quickAddDurationCells?: number;
  /** Целый день (отсутствие): превью от начала дня; хит на остальных слотах — по одной клетке. */
  quickAddSnapToDay?: boolean;
  quickAddSpan?: number;
  sprintStartDate: Date;
  taskAreaHeight: number;
  taskLayerHeight?: number;
  totalHeight: number;
  onQuickAddHoverPreviewChange?: (preview: {
    cellIndex: number;
    layer: number;
    span: number;
  } | null) => void;
  onQuickAddTask?: (payload: { assigneeId: string; day: number; part: number }) => void;
}) {
  const {
    dayCount,
    dayIndex,
    developerId,
    hasTaskOverlaps,
    hidePartDivider = false,
    isDraggingTask,
    isLinking = false,
    maxTaskLayers = 1,
    occupiedLayersByCell,
    partIndex,
    quickAddClipHeight,
    quickAddDurationCells = 1,
    quickAddSnapToDay = false,
    quickAddSpan = 1,
    sprintStartDate,
    taskAreaHeight,
    taskLayerHeight,
    totalHeight,
    onQuickAddHoverPreviewChange,
    onQuickAddTask,
  } = props;

  const cellId = `cell-${developerId}-${dayIndex}-${partIndex}`;
  const partsPerDay = getPartsPerDay();
  const dayStartCell = dayIndex * partsPerDay;
  const cellStart = quickAddSnapToDay ? dayStartCell : dayStartCell + partIndex;
  const remainingCells = Math.max(1, dayCount * partsPerDay - cellStart);
  const footprintCells = quickAddSnapToDay ? partsPerDay : quickAddDurationCells;
  const durationCells = Math.min(footprintCells, remainingCells);
  // На слотах после первого дня hit — одна клетка (иначе overflow упрётся в соседний stacking context).
  const hitDurationCells = quickAddSnapToDay && partIndex !== 0 ? 1 : durationCells;
  const quickAddBand = resolveSwimlaneQuickAddLayerBand(
    collectOccupiedLayersForCellRange(occupiedLayersByCell, cellStart, durationCells),
    maxTaskLayers,
    quickAddSpan
  );
  const partStatus = getPartStatus(dayIndex, partIndex, sprintStartDate, dayCount);
  // Key stays stable across drag so cells are not remounted when + is suppressed.
  const isQuickAddEnabled = Boolean(onQuickAddTask);
  const showQuickAddButton =
    isQuickAddEnabled && !isDraggingTask && !isLinking && quickAddBand != null;

  return (
    <DroppableCell
      key={`${cellId}-${isQuickAddEnabled ? 'add' : 'idle'}`}
      hasTaskOverlaps={hasTaskOverlaps}
      hidePartDivider={hidePartDivider}
      partIndex={partIndex}
      partStatus={partStatus}
      quickAddClipHeight={quickAddClipHeight}
      quickAddDurationCells={hitDurationCells}
      quickAddLayer={quickAddBand?.layer ?? 0}
      quickAddLayerSpan={quickAddBand?.span ?? 1}
      taskAreaHeight={taskAreaHeight}
      taskLayerHeight={taskLayerHeight}
      totalHeight={totalHeight}
      onQuickAddClick={
        showQuickAddButton && onQuickAddTask
          ? createQuickAddTaskHandler(onQuickAddTask, developerId, dayIndex, partIndex)
          : undefined
      }
      onQuickAddHoverChange={
        showQuickAddButton && quickAddBand
          ? createQuickAddHoverHandler(onQuickAddHoverPreviewChange, cellStart, quickAddBand)
          : undefined
      }
    />
  );
}
