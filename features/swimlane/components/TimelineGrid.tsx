'use client';

/**
 * Компонент сетки времени в свимлейне
 */

import type { AvailabilityCardKind } from '@/features/swimlane/utils/availabilityCardKind';
import type { PlacedSwimlaneLayerItem } from '@/features/swimlane/utils/layerUtils';

import { WORKING_DAYS, getPartsPerDay } from '@/constants';
import { PlannerHatchOverlay } from '@/features/sprint/components/SprintPlanner/layout/PlannerHatchOverlay';
import {
  TIMELINE_TODAY_COLUMN_TINT_CLASS,
  timelineDayDividerClass,
} from '@/features/sprint/utils/timelineColumnChrome';
import { TimelineWeekendHatch } from '@/features/swimlane/components/TimelineWeekendHatch';
import {
  buildHolidayHatchRanges,
  buildUnavailableHatchRanges,
  isInternalAvailabilityDayDivider,
  isInternalHolidayDayDivider,
} from '@/features/swimlane/utils/availabilityTimelineMarks';
import { getDayDate } from '@/lib/planner-timeline/occupancyUtils';
import { isPlannerToday } from '@/utils/dateUtils';

import { TimelineGridPartCell } from './TimelineGridPartCell';

interface TimelineGridProps {
  /** Автосортировка карточек: «+» показывает слот жадной укладки. */
  autoArrange?: boolean;
  developerId: string;
  hasTaskOverlaps?: boolean;
  /** Индексы дней (0..9), которые являются нерабочими/праздничными */
  holidayDayIndices?: Set<number>;
  isDraggingTask: boolean;
  isLinking?: boolean;
  maxTaskLayers?: number;
  /** Разделители частей дня: только при перетаскивании или ресайзе карточки этой строки */
  partDividersVisible?: boolean;
  /**
   * Высота подложки нерабочих дней и занятости (px). Задаётся по зоне карточек,
   * чтобы дорожки факта и календаря под ней шли отдельными строками; без неё — на всю высоту.
   */
  patternHeight?: number;
  /** Уложенные карточки дорожки: по ним «+» ищет слой будущего черновика. */
  placedLayerItems?: readonly PlacedSwimlaneLayerItem[];
  /** Высота строки карточек — чтобы «+» не вылезал в соседний свимлейн */
  quickAddClipHeight?: number;
  quickAddFootprint?: {
    durationCells: number;
    mustFitSprint?: boolean;
    span: number;
    snapToDay?: boolean;
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
  autoArrange = false,
  developerId,
  isDraggingTask,
  isLinking = false,
  sprintStartDate,
  sprintTimelineWorkingDays = WORKING_DAYS,
  maxTaskLayers = 1,
  placedLayerItems,
  hasTaskOverlaps,
  partDividersVisible = false,
  patternHeight,
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
  const quickAddSnapToDay = quickAddFootprint?.snapToDay === true;
  const quickAddSpan = quickAddFootprint?.span ?? 1;
  const quickAddMustFitSprint = quickAddFootprint?.mustFitSprint === true;
  const hasPatternRanges = hatchRanges.length > 0 || holidayRanges.length > 0;
  const todayDayIndex = Array.from({ length: dayCount }, (_, dayIndex) =>
    getDayDate(sprintStartDate, dayIndex, dayCount)
  ).findIndex(isPlannerToday);

  return (
    <div className="relative h-full w-full min-w-0 bg-white swimlane-lane-fill dark:bg-gray-800">
      {hasPatternRanges ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-0"
          style={{ height: patternHeight ?? '100%' }}
        >
          {hatchRanges.map((range) => (
            <div
              key={`${range.startDay}-${range.kind}`}
              className="absolute inset-y-0 overflow-hidden"
              style={{
                left: `${(range.startDay / dayCount) * 100}%`,
                width: `${(range.daySpan / dayCount) * 100}%`,
              }}
            >
              <PlannerHatchOverlay heightPx={patternHeight ?? totalHeight} tone={range.kind} />
            </div>
          ))}
          {holidayRanges.map((range) => (
            <TimelineWeekendHatch
              key={`weekend-${range.startDay}`}
              dayCount={dayCount}
              daySpan={range.daySpan}
              startDay={range.startDay}
            />
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
          return (
            <div
              key={dayIndex}
              className={`${DAY_COLUMN_CLASS} ${DAY_COLUMN_ROW_BORDER_CLASS}`}
            >
              {dayIndex === todayDayIndex ? (
                <div className={TIMELINE_TODAY_COLUMN_TINT_CLASS} />
              ) : null}
              {dividerClass ? (
                <div
                  className={`pointer-events-none absolute bottom-0 right-0 top-0 w-px ${dividerClass}`}
                />
              ) : null}
              {Array.from({ length: getPartsPerDay() }, (_, partIndex) => (
                <TimelineGridPartCell
                  key={`${developerId}-${dayIndex}-${partIndex}`}
                  autoArrange={autoArrange}
                  dayCount={dayCount}
                  dayIndex={dayIndex}
                  developerId={developerId}
                  hasTaskOverlaps={hasTaskOverlaps}
                  hidePartDivider={hidePartDivider}
                  isDraggingTask={isDraggingTask}
                  isLinking={isLinking}
                  maxTaskLayers={maxTaskLayers}
                  partDividerVisible={partDividersVisible}
                  partIndex={partIndex}
                  placedLayerItems={placedLayerItems}
                  quickAddClipHeight={quickAddClipHeight}
                  quickAddDurationCells={quickAddDurationCells}
                  quickAddMustFitSprint={quickAddMustFitSprint}
                  quickAddSnapToDay={quickAddSnapToDay}
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
