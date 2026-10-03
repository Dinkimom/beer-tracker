'use client';

import type { CSSProperties } from 'react';

import { ZIndex, getPartsPerDay } from '@/constants';
import { factTimelineHolidayMask } from '@/features/swimlane/utils/in-progress-fact/swimlaneInProgressFactLayerHelpers';
import { computeBaselineStripOpacity } from '@/features/swimlane/utils/taskLayerTaskLayout';
import { buildSwimlaneOverdueBaselineStripHorizontalStyle } from '@/features/task/components/TaskBar/taskBarHelpers';

interface TaskLayerOverdueBaselineStripsProps {
  activeTaskDuration: number | null;
  assigneeId: string;
  baselineHeight: number;
  baselineTop: number;
  currentCell: number;
  /** Индексы нерабочих дней таймлайна — в этих колонках полоса не видна */
  holidayDayIndices?: ReadonlySet<number>;
  hoveredCell: { assigneeId: string; day: number; part: number } | null;
  hoveredTaskId: string | null;
  isDark: boolean;
  isDraggingTask: boolean;
  linkingActive?: boolean;
  strips: Array<{ baselineStart: number; baselineWidth: number }>;
  taskId: string;
  timelineTotalParts: number;
}

export function TaskLayerOverdueBaselineStrips({
  activeTaskDuration,
  assigneeId,
  baselineHeight,
  baselineTop,
  currentCell,
  holidayDayIndices,
  hoveredCell,
  hoveredTaskId,
  isDark,
  isDraggingTask,
  linkingActive = false,
  strips,
  taskId,
  timelineTotalParts,
}: TaskLayerOverdueBaselineStripsProps) {
  if (strips.length === 0) return null;

  const holidayMask = factTimelineHolidayMask(
    holidayDayIndices,
    timelineTotalParts,
    getPartsPerDay()
  );
  const holidayMaskStyle: CSSProperties | undefined = holidayMask
    ? { maskImage: holidayMask, WebkitMaskImage: holidayMask }
    : undefined;

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${ZIndex.class('base')}`}
      style={holidayMaskStyle}
    >
      {strips.map(({ baselineStart, baselineWidth }, stripIdx) => {
        const baselineOpacity = computeBaselineStripOpacity({
          activeTaskDuration,
          assigneeId,
          baselineStart,
          baselineWidth,
          hoveredCell,
          hoveredTaskId,
          isDraggingTask,
          linkingActive,
          taskId,
        });
        return (
          <div
            key={`baseline-${taskId}-${stripIdx}-${baselineStart}-${currentCell}`}
            className="absolute pointer-events-none overflow-hidden rounded-r-lg transition-opacity duration-200"
            style={{
              background: isDark
                ? 'repeating-linear-gradient(45deg, rgb(127 29 29), rgb(127 29 29) 8px, rgb(153 27 27) 8px, rgb(153 27 27) 16px)'
                : 'repeating-linear-gradient(45deg, rgb(254 226 226), rgb(254 226 226) 8px, rgb(252 165 165) 8px, rgb(252 165 165) 16px)',
              height: `${baselineHeight}px`,
              opacity: baselineOpacity,
              top: `${baselineTop}px`,
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
  );
}
