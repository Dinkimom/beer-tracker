import type { Task } from '@/types';
import type { MouseEvent } from 'react';

import { getPartsPerDay } from '@/constants';
import { DroppableCell } from '@/features/swimlane/components/DroppableCell';
import {
  collectOccupiedLayersForCellRange,
  resolveSwimlaneQuickAddLayerBand,
} from '@/features/swimlane/utils/swimlaneCellOccupancy';
import { isOnboardingDemoAssigneeId } from '@/lib/plannerOnboarding/onboardingDemoLane';
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

function computeTimelineCellHighlight(params: {
  activeTaskDuration: number | null;
  dayIndex: number;
  hoveredCell: { assigneeId: string; day: number; part: number } | null;
  isDraggingTask: boolean;
  partIndex: number;
}): boolean {
  const { activeTaskDuration, dayIndex, hoveredCell, isDraggingTask, partIndex } = params;
  const hoverStart =
    isDraggingTask && hoveredCell && activeTaskDuration != null
      ? hoveredCell.day * getPartsPerDay() + hoveredCell.part
      : null;
  const hoverEnd =
    hoverStart != null && activeTaskDuration != null ? hoverStart + activeTaskDuration : null;
  const cellStart = dayIndex * getPartsPerDay() + partIndex;
  return hoverEnd != null && hoverStart != null && cellStart >= hoverStart && cellStart < hoverEnd;
}

export function TimelineGridPartCell(props: {
  activeTask: Task | null;
  activeTaskDuration: number | null;
  dayCount: number;
  dayIndex: number;
  developerId: string;
  hasTaskOverlaps?: boolean;
  hasAvailabilityEvent?: boolean;
  holidayDayIndices?: Set<number>;
  hoveredCell: { assigneeId: string; day: number; part: number } | null;
  isDraggingTask: boolean;
  isLinking?: boolean;
  maxTaskLayers?: number;
  occupiedLayersByCell?: Map<number, Set<number>>;
  partIndex: number;
  quickAddClipHeight?: number;
  quickAddDurationCells?: number;
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
    activeTask,
    activeTaskDuration,
    dayCount,
    dayIndex,
    developerId,
    hasTaskOverlaps,
    hasAvailabilityEvent = false,
    holidayDayIndices,
    hoveredCell,
    isDraggingTask,
    isLinking = false,
    maxTaskLayers = 1,
    occupiedLayersByCell,
    partIndex,
    quickAddClipHeight,
    quickAddDurationCells = 1,
    quickAddSpan = 1,
    sprintStartDate,
    taskAreaHeight,
    taskLayerHeight,
    totalHeight,
    onQuickAddHoverPreviewChange,
    onQuickAddTask,
  } = props;

  const cellId = `cell-${developerId}-${dayIndex}-${partIndex}`;
  const cellStart = dayIndex * getPartsPerDay() + partIndex;
  const remainingCells = Math.max(1, dayCount * getPartsPerDay() - cellStart);
  const durationCells = Math.min(quickAddDurationCells, remainingCells);
  const quickAddBand = resolveSwimlaneQuickAddLayerBand(
    collectOccupiedLayersForCellRange(occupiedLayersByCell, cellStart, durationCells),
    maxTaskLayers,
    quickAddSpan
  );
  const isHighlighted = computeTimelineCellHighlight({
    activeTaskDuration,
    dayIndex,
    hoveredCell,
    isDraggingTask,
    partIndex,
  });
  const partStatus = getPartStatus(dayIndex, partIndex, sprintStartDate, dayCount);
  // Key stays stable across drag so droppables are not remounted when + is suppressed.
  const isQuickAddEnabled = Boolean(onQuickAddTask);
  const showQuickAddButton =
    isQuickAddEnabled && !isDraggingTask && !isLinking && quickAddBand != null;

  return (
    <DroppableCell
      key={`${cellId}-${isQuickAddEnabled ? 'add' : 'idle'}`}
      activeTask={activeTask}
      dropDisabled={isOnboardingDemoAssigneeId(developerId)}
      hasAvailabilityEvent={hasAvailabilityEvent}
      hasTaskOverlaps={hasTaskOverlaps}
      id={cellId}
      isHighlighted={isHighlighted}
      isHoliday={holidayDayIndices?.has(dayIndex)}
      partIndex={partIndex}
      partStatus={partStatus}
      quickAddClipHeight={quickAddClipHeight}
      quickAddDurationCells={durationCells}
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
