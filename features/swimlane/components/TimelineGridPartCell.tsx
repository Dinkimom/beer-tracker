import type { PlacedSwimlaneLayerItem } from '@/features/swimlane/utils/layerUtils';
import type { MouseEvent } from 'react';

import { getPartsPerDay } from '@/constants';
import { DroppableCell } from '@/features/swimlane/components/DroppableCell';
import { resolveSwimlaneQuickAddLayerBand } from '@/features/swimlane/utils/swimlaneCellOccupancy';
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
  autoArrange?: boolean;
  dayCount: number;
  dayIndex: number;
  developerId: string;
  hasTaskOverlaps?: boolean;
  hidePartDivider?: boolean;
  isDraggingTask: boolean;
  isLinking?: boolean;
  maxTaskLayers?: number;
  /** Разделители частей дня: при перетаскивании и ресайзе карточки в этой строке */
  partDividerVisible: boolean;
  partIndex: number;
  placedLayerItems?: readonly PlacedSwimlaneLayerItem[];
  quickAddClipHeight?: number;
  quickAddDurationCells?: number;
  /** Не укорачивать футпринт у конца спринта: не помещается — ячейка без «+» (T4). */
  quickAddMustFitSprint?: boolean;
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
    autoArrange = false,
    dayCount,
    dayIndex,
    developerId,
    hasTaskOverlaps,
    hidePartDivider = false,
    isDraggingTask,
    isLinking = false,
    maxTaskLayers = 1,
    partDividerVisible,
    partIndex,
    placedLayerItems,
    quickAddClipHeight,
    quickAddDurationCells = 1,
    quickAddMustFitSprint = false,
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
  const quickAddDoesNotFitSprint = quickAddMustFitSprint && footprintCells > remainingCells;
  // На слотах после первого дня hit — одна клетка (иначе overflow упрётся в соседний stacking context).
  const hitDurationCells = quickAddSnapToDay && partIndex !== 0 ? 1 : durationCells;
  const quickAddBand = resolveSwimlaneQuickAddLayerBand({
    autoArrange,
    durationCells,
    lane: placedLayerItems,
    maxTaskLayers,
    span: quickAddSpan,
    startCell: cellStart,
  });
  const partStatus = getPartStatus(dayIndex, partIndex, sprintStartDate, dayCount);
  // Key stays stable across drag so cells are not remounted when + is suppressed.
  const isQuickAddEnabled = Boolean(onQuickAddTask);
  const showQuickAddButton =
    isQuickAddEnabled &&
    !isDraggingTask &&
    !isLinking &&
    !quickAddDoesNotFitSprint &&
    quickAddBand != null;

  return (
    <DroppableCell
      key={`${cellId}-${isQuickAddEnabled ? 'add' : 'idle'}`}
      hasTaskOverlaps={hasTaskOverlaps}
      hidePartDivider={hidePartDivider}
      partDividerVisible={partDividerVisible}
      partIndex={partIndex}
      partStatus={partStatus}
      quickAddClipHeight={quickAddClipHeight}
      quickAddDoesNotFitSprint={
        isQuickAddEnabled && !isDraggingTask && !isLinking && quickAddDoesNotFitSprint
      }
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
