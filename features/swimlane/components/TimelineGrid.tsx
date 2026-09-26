/**
 * Компонент сетки времени в свимлейне
 */

import type { AvailabilityCardKind } from '@/features/swimlane/utils/availabilityCardKind';
import type { Task } from '@/types';

import { WORKING_DAYS, getPartsPerDay } from '@/constants';
import { PlannerHatchOverlay } from '@/features/sprint/components/SprintPlanner/layout/PlannerHatchOverlay';
import { timelineDayDividerClass } from '@/features/sprint/utils/timelineColumnChrome';
import { buildUnavailableHatchRanges } from '@/features/swimlane/utils/availabilityTimelineMarks';

import { TimelineGridPartCell } from './TimelineGridPartCell';

interface TimelineGridProps {
  activeTask: Task | null;
  activeTaskDuration: number | null;
  developerId: string;
  hasTaskOverlaps?: boolean;
  /** Индексы дней (0..9), которые являются нерабочими/праздничными */
  holidayDayIndices?: Set<number>;
  hoveredCell: { assigneeId: string; day: number; part: number } | null;
  isDraggingTask: boolean;
  isLinking?: boolean;
  maxTaskLayers?: number;
  occupiedLayersByCell?: Map<number, Set<number>>;
  /** Высота строки карточек — чтобы «+» не вылезал в соседний свимлейн */
  quickAddClipHeight?: number;
  quickAddFootprint?: {
    durationCells: number;
    span: number;
  };
  sprintStartDate: Date;
  /** Рабочих дней в таймлайне */
  sprintTimelineWorkingDays?: number;
  taskAreaHeight: number;
  taskLayerHeight?: number;
  totalHeight: number;
  /** Дни, когда исполнитель недоступен, и тон штриховки по типу события */
  unavailableDayHatchKinds?: ReadonlyMap<number, AvailabilityCardKind>;
  unavailableDayTitles?: ReadonlyMap<number, string>;
  onQuickAddHoverPreviewChange?: (preview: {
    cellIndex: number;
    layer: number;
    span: number;
  } | null) => void;
  onQuickAddTask?: (payload: {
    assigneeId: string;
    day: number;
    part: number;
  }) => void;
}

const DAY_COLUMN_CLASS = 'relative isolate flex h-full min-w-0';

export function TimelineGrid({
  activeTask,
  activeTaskDuration,
  developerId,
  hoveredCell,
  isDraggingTask,
  isLinking = false,
  sprintStartDate,
  sprintTimelineWorkingDays = WORKING_DAYS,
  maxTaskLayers = 1,
  occupiedLayersByCell,
  hasTaskOverlaps,
  quickAddClipHeight,
  quickAddFootprint,
  taskAreaHeight,
  taskLayerHeight,
  totalHeight,
  unavailableDayHatchKinds,
  unavailableDayTitles,
  onQuickAddHoverPreviewChange,
  onQuickAddTask,
  holidayDayIndices,
}: TimelineGridProps) {
  const dayCount = Math.max(1, sprintTimelineWorkingDays);
  const hatchRanges = buildUnavailableHatchRanges(unavailableDayHatchKinds, dayCount);
  const quickAddDurationCells = quickAddFootprint?.durationCells ?? 1;
  const quickAddSpan = quickAddFootprint?.span ?? 1;

  return (
    <div className="relative h-full w-full min-w-0 bg-white dark:bg-gray-800">
      {hatchRanges.length > 0 ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {hatchRanges.map((range) => (
            <div
              key={`${range.startDay}-${range.kind}`}
              className="absolute inset-y-0 overflow-hidden"
              style={{
                left: `${(range.startDay / dayCount) * 100}%`,
                width: `${(range.daySpan / dayCount) * 100}%`,
              }}
            >
              <PlannerHatchOverlay tone={range.kind} />
            </div>
          ))}
        </div>
      ) : null}
      <div
        className="relative grid h-full w-full min-w-0"
        style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: dayCount }, (_, dayIndex) => {
          const isHoliday = holidayDayIndices?.has(dayIndex) ?? false;
          const dividerClass = timelineDayDividerClass(dayIndex, dayCount);
          const hasAvailabilityHatch = unavailableDayHatchKinds?.has(dayIndex) ?? false;
          const showHolidayHatch = isHoliday && !hasAvailabilityHatch;
          const unavailableTitle = unavailableDayTitles?.get(dayIndex);
          return (
            <div key={dayIndex} className={DAY_COLUMN_CLASS} title={unavailableTitle}>
              {showHolidayHatch ? (
                <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                  <PlannerHatchOverlay />
                </div>
              ) : null}
              {dividerClass ? (
                <div
                  className={`pointer-events-none absolute bottom-0 right-0 top-0 w-px ${dividerClass}`}
                />
              ) : null}
              {Array.from({ length: getPartsPerDay() }, (_, partIndex) => (
                <TimelineGridPartCell
                  key={`${developerId}-${dayIndex}-${partIndex}`}
                  activeTask={activeTask}
                  activeTaskDuration={activeTaskDuration}
                  dayCount={dayCount}
                  dayIndex={dayIndex}
                  developerId={developerId}
                  hasTaskOverlaps={hasTaskOverlaps}
                  hoveredCell={hoveredCell}
                  isDraggingTask={isDraggingTask}
                  isLinking={isLinking}
                  maxTaskLayers={maxTaskLayers}
                  occupiedLayersByCell={occupiedLayersByCell}
                  partIndex={partIndex}
                  quickAddClipHeight={quickAddClipHeight}
                  quickAddDurationCells={quickAddDurationCells}
                  quickAddSpan={quickAddSpan}
                  sprintStartDate={sprintStartDate}
                  taskAreaHeight={taskAreaHeight}
                  taskLayerHeight={taskLayerHeight}
                  totalHeight={totalHeight}
                  onQuickAddHoverPreviewChange={onQuickAddHoverPreviewChange}
                  onQuickAddTask={onQuickAddTask}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
