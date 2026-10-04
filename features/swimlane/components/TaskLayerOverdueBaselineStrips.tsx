'use client';

import type { CSSProperties } from 'react';

import { useState } from 'react';

import { ZIndex, getPartsPerDay } from '@/constants';
import { factTimelineHolidayMask } from '@/features/swimlane/utils/in-progress-fact/swimlaneInProgressFactLayerHelpers';
import { isStrongOverdue } from '@/features/swimlane/utils/overdueBaselineSummary';
import { computeBaselineStripOpacity } from '@/features/swimlane/utils/taskLayerTaskLayout';
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
  hoveredTaskId: string | null;
  isDark: boolean;
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
  hoveredTaskId,
  isDark,
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
      {showChip
        ? strips.map(({ baselineStart, baselineWidth }) => {
            const revealed =
              isStrongOverdue(baselineWidth, partsPerDay) ||
              hoveredTaskId === taskId ||
              openTaskId === taskId;
            if (!revealed) return null;
            return (
              <TaskLayerOverdueBaselineChip
                key={`overdue-chip-${taskId}-${baselineStart}`}
                baselineHeight={baselineHeight}
                baselineTop={baselineTop}
                canExtend={onExtend != null}
                cells={baselineWidth}
                isDark={isDark}
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
            );
          })
        : null}
    </div>
  );
}
