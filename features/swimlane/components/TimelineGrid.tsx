'use client';

/**
 * Компонент сетки времени в свимлейне
 */

import type { AvailabilityCardKind } from '@/features/swimlane/utils/availabilityCardKind';

import { WORKING_DAYS, getPartsPerDay } from '@/constants';
import { PlannerHatchOverlay } from '@/features/sprint/components/SprintPlanner/layout/PlannerHatchOverlay';
import { timelineDayDividerClass } from '@/features/sprint/utils/timelineColumnChrome';
import {
  buildHolidayHatchRanges,
  buildUnavailableHatchRanges,
  isInternalAvailabilityDayDivider,
  isInternalHolidayDayDivider,
} from '@/features/swimlane/utils/availabilityTimelineMarks';

import { TimelineGridPartCell } from './TimelineGridPartCell';

interface TimelineGridProps {
  developerId: string;
  /**
   * Последняя строка свимлейна: нижняя граница на всех колонках, включая паттерн
   * выходного/отсутствия.
   */
  forceRowBorder?: boolean;
  hasTaskOverlaps?: boolean;
  /** Индексы дней (0..9), которые являются нерабочими/праздничными */
  holidayDayIndices?: Set<number>;
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
/** Как у колонки исполнителей: border-b внутри ячейки (box-shadow перекрывался фоном следующей строки). */
const DAY_COLUMN_ROW_BORDER_CLASS = 'border-b border-gray-200 dark:border-gray-700';

export function TimelineGrid({
  developerId,
  forceRowBorder = false,
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
  onQuickAddHoverPreviewChange,
  onQuickAddTask,
  holidayDayIndices,
}: TimelineGridProps) {
  const dayCount = Math.max(1, sprintTimelineWorkingDays);
  const hatchRanges = buildUnavailableHatchRanges(unavailableDayHatchKinds, dayCount);
  const holidayRanges = buildHolidayHatchRanges(
    holidayDayIndices,
    unavailableDayHatchKinds,
    dayCount
  );
  const quickAddDurationCells = quickAddFootprint?.durationCells ?? 1;
  const quickAddSpan = quickAddFootprint?.span ?? 1;
  const hasPatternRanges = hatchRanges.length > 0 || holidayRanges.length > 0;

  return (
    <div className="relative h-full w-full min-w-0 bg-white swimlane-lane-fill dark:bg-gray-800">
      {hasPatternRanges ? (
        <div className="pointer-events-none absolute inset-0 z-0">
          {hatchRanges.map((range) => (
            <div
              key={`${range.startDay}-${range.kind}`}
              className="absolute inset-y-0 overflow-hidden"
              style={{
                left: `${(range.startDay / dayCount) * 100}%`,
                width: `${(range.daySpan / dayCount) * 100}%`,
              }}
            >
              <PlannerHatchOverlay heightPx={totalHeight} tone={range.kind} />
            </div>
          ))}
          {holidayRanges.map((range) => (
            <div
              key={`weekend-${range.startDay}`}
              className="absolute inset-y-0 overflow-hidden"
              style={{
                left: `${(range.startDay / dayCount) * 100}%`,
                width: `${(range.daySpan / dayCount) * 100}%`,
              }}
            >
              {/*
                Без heightPx — фиксированный шаг тайла, как у кладбища дедлайнов.
                Так узор не «сжимается» под высоту одной строки.
              */}
              <PlannerHatchOverlay tone="weekend" />
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
          const hasAvailabilityHatch = unavailableDayHatchKinds?.has(dayIndex) ?? false;
          const showHolidayHatch = isHoliday && !hasAvailabilityHatch;
          const isPatternColumn = hasAvailabilityHatch || showHolidayHatch;
          const hideDayDivider =
            isInternalAvailabilityDayDivider(
              unavailableDayHatchKinds,
              dayIndex,
              dayCount
            ) ||
            isInternalHolidayDayDivider(
              holidayDayIndices,
              unavailableDayHatchKinds,
              dayIndex,
              dayCount
            );
          const dividerClass = hideDayDivider
            ? null
            : timelineDayDividerClass(dayIndex, dayCount);
          const hidePartDivider = isPatternColumn;
          const showRowBorder = forceRowBorder || !isPatternColumn;
          const columnClassName = showRowBorder
            ? `${DAY_COLUMN_CLASS} ${DAY_COLUMN_ROW_BORDER_CLASS}`
            : DAY_COLUMN_CLASS;
          return (
            <div key={dayIndex} className={columnClassName}>
              {dividerClass ? (
                <div
                  className={`pointer-events-none absolute bottom-0 right-0 top-0 w-px ${dividerClass}`}
                />
              ) : null}
              {Array.from({ length: getPartsPerDay() }, (_, partIndex) => (
                <TimelineGridPartCell
                  key={`${developerId}-${dayIndex}-${partIndex}`}
                  dayCount={dayCount}
                  dayIndex={dayIndex}
                  developerId={developerId}
                  hasTaskOverlaps={hasTaskOverlaps}
                  hidePartDivider={hidePartDivider}
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
