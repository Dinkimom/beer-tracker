'use client';

import type { CSSProperties } from 'react';

import { useState } from 'react';

import { ZIndex, getPartsPerDay } from '@/constants';
import { useSwimlaneDragHoverSelector } from '@/features/swimlane/hooks/useSwimlaneDragHover';
import { factTimelineHolidayMask } from '@/features/swimlane/utils/in-progress-fact/swimlaneInProgressFactLayerHelpers';
import { computeBaselineStripsDragDimMask } from '@/features/swimlane/utils/taskLayerTaskLayout';
import { SWIMLANE_BASELINE_DRAG_DIM_OPACITY } from '@/features/swimlane/utils/taskLayerTaskLayoutHelpers';
import {
  buildSwimlaneOverdueBaselineStripHorizontalStyle,
  SWIMLANE_OVERDUE_BASELINE_CHIP_END_INSET_PX,
} from '@/features/task/components/TaskBar/taskBarHelpers';

import { TaskLayerOverdueBaselineChip } from './TaskLayerOverdueBaselineChip';

const OVERDUE_BASELINE_LINE_PX = 3;

interface TaskLayerOverdueBaselineStripsProps {
  activeTaskDuration: number | null;
  assigneeId: string;
  /** Сдвиг линии и чипа вниз от центра карточки, чтобы не пересечь стрелку связи. */
  baselineCenterOffsetPx?: number;
  baselineHeight: number;
  baselineTop: number;
  currentCell: number;
  /** Индексы нерабочих дней таймлайна — в этих колонках полоса не видна */
  holidayDayIndices?: ReadonlySet<number>;
  isDraggingTask: boolean;
  linkingActive?: boolean;
  status: string | undefined;
  strips: Array<{ baselineStart: number; baselineWidth: number }>;
  taskId: string;
  timelineTotalParts: number;
  /** Закрыть задачу и завести новую с текущей ячейки. */
  onCloseAndCreate?: () => Promise<void> | void;
  /** Продлить последний отрезок плана до «сейчас». */
  onExtend?: () => void;
}

export function TaskLayerOverdueBaselineStrips({
  activeTaskDuration,
  assigneeId,
  baselineCenterOffsetPx = 0,
  baselineHeight,
  baselineTop,
  currentCell,
  holidayDayIndices,
  isDraggingTask,
  linkingActive = false,
  onCloseAndCreate,
  onExtend,
  status,
  strips,
  taskId,
  timelineTotalParts,
}: TaskLayerOverdueBaselineStripsProps) {
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const dragDimMask = useSwimlaneDragHoverSelector(
    (hoveredCell) =>
      computeBaselineStripsDragDimMask({
        activeTaskDuration,
        assigneeId,
        hoveredCell,
        isDraggingTask,
        strips,
      }),
    isDraggingTask && strips.length > 0
  );
  if (strips.length === 0) return null;

  const holidayMask = factTimelineHolidayMask(
    holidayDayIndices,
    timelineTotalParts,
    getPartsPerDay()
  );
  const holidayMaskStyle: CSSProperties | undefined = holidayMask
    ? { maskImage: holidayMask, WebkitMaskImage: holidayMask }
    : undefined;

  const partsPerDay = getPartsPerDay();
  const showChip = !isDraggingTask && !linkingActive;

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className={`absolute inset-0 ${ZIndex.class('base')}`} style={holidayMaskStyle}>
      {strips.map(({ baselineStart, baselineWidth }, stripIdx) => {
        const baselineOpacity =
          (dragDimMask >> stripIdx) & 1 ? SWIMLANE_BASELINE_DRAG_DIM_OPACITY : 1;
        return (
          <div
            key={`baseline-${taskId}-${stripIdx}-${baselineStart}-${currentCell}`}
            className="absolute pointer-events-none rounded-full bg-red-400 transition-opacity duration-200 dark:bg-red-400/80"
            style={{
              height: `${OVERDUE_BASELINE_LINE_PX}px`,
              opacity: baselineOpacity,
              top: `${baselineTop + (baselineHeight - OVERDUE_BASELINE_LINE_PX) / 2 + baselineCenterOffsetPx}px`,
              ...buildSwimlaneOverdueBaselineStripHorizontalStyle({
                durationCells: baselineWidth,
                endInsetPx: SWIMLANE_OVERDUE_BASELINE_CHIP_END_INSET_PX,
                startCell: baselineStart,
                timelineTotalParts,
              }),
            }}
          />
        );
      })}
      </div>
      {showChip
        ? strips.map(({ baselineStart, baselineWidth }) => (
            <TaskLayerOverdueBaselineChip
              key={`overdue-chip-${taskId}-${baselineStart}`}
              baselineCenterOffsetPx={baselineCenterOffsetPx}
              baselineHeight={baselineHeight}
              baselineTop={baselineTop}
              canExtend={onExtend != null}
              cells={baselineWidth}
              open={openTaskId === taskId}
              partsPerDay={partsPerDay}
              startCell={baselineStart}
              status={status}
              taskId={taskId}
              timelineTotalParts={timelineTotalParts}
              onCloseAndCreate={onCloseAndCreate}
              onExtend={onExtend}
              onOpenChange={(next) => setOpenTaskId(next ? taskId : null)}
            />
          ))
        : null}
    </div>
  );
}
