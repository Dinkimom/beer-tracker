'use client';

import type { CSSProperties } from 'react';

import { useState } from 'react';

import { ZIndex, getPartsPerDay } from '@/constants';
import { factTimelineHolidayMask } from '@/features/swimlane/utils/in-progress-fact/swimlaneInProgressFactLayerHelpers';
import {
  computeBaselineStripOpacity,
  computeSwimlaneOverdueBaselineBarBox,
} from '@/features/swimlane/utils/taskLayerTaskLayout';
import { buildSwimlaneOverdueBaselineStripHorizontalStyle } from '@/features/task/components/TaskBar/taskBarHelpers';

import { TaskLayerOverdueBaselineChip } from './TaskLayerOverdueBaselineChip';

interface TaskLayerOverdueBaselineStripsProps {
  activeTaskDuration: number | null;
  assigneeId: string;
  baselineHeight: number;
  baselineTop: number;
  currentCell: number;
  /** Индексы нерабочих дней таймлайна — в этих колонках полоса не видна */
  holidayDayIndices?: ReadonlySet<number>;
  hoveredCell: { assigneeId: string; day: number; part: number } | null;
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
  baselineHeight,
  baselineTop,
  currentCell,
  holidayDayIndices,
  hoveredCell,
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
  const bar = computeSwimlaneOverdueBaselineBarBox(baselineTop, baselineHeight);

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className={`absolute inset-0 ${ZIndex.class('base')}`} style={holidayMaskStyle}>
      {strips.map(({ baselineStart, baselineWidth }, stripIdx) => {
        const baselineOpacity = computeBaselineStripOpacity({
          activeTaskDuration,
          assigneeId,
          baselineStart,
          baselineWidth,
          hoveredCell,
          isDraggingTask,
        });
        return (
          <div
            key={`baseline-${taskId}-${stripIdx}-${baselineStart}-${currentCell}`}
            className="absolute pointer-events-none box-border overflow-hidden rounded-r-md border-y border-r border-red-300 bg-red-100 transition-opacity duration-200 dark:border-red-700 dark:bg-red-900"
            style={{
              height: `${bar.height}px`,
              opacity: baselineOpacity,
              top: `${bar.top}px`,
              ...buildSwimlaneOverdueBaselineStripHorizontalStyle({
                durationCells: baselineWidth,
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
              baselineHeight={bar.height}
              baselineTop={bar.top}
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
