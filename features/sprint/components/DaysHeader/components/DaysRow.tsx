'use client';

import type { DayErrorDetail } from '@/features/sprint/utils/occupancyValidation';
import type { Task } from '@/types';

import { DayHeaderCellContent } from '@/components/DayHeaderCell';
import { WORKING_DAYS } from '@/constants';
import { plannerNowFromMinute, usePlannerNowMinute } from '@/features/sprint/hooks/usePlannerNowMinute';
import { getDayDate } from '@/features/sprint/utils/occupancyUtils';
import {
  plannerNowWithinDay,
  timelineDayDividerClass,
} from '@/features/sprint/utils/timelineColumnChrome';
import { getDayStatus } from '@/utils/dateUtils';

type DayStatus = ReturnType<typeof getDayStatus>;

function occupancyDayHeaderClass(status: DayStatus, isPast: boolean, isHoliday: boolean): string {
  if (status === 'today') {
    return 'bg-gradient-to-br from-blue-50 to-blue-100/80 dark:from-blue-900/40 dark:to-blue-800/40';
  }
  if (isPast) {
    return 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500';
  }
  if (isHoliday) {
    return 'bg-gray-50 dark:bg-gray-900/40';
  }
  return 'bg-white dark:bg-gray-800';
}

function swimlaneDayCellClass(status: DayStatus): string {
  if (status === 'today') {
    return 'bg-gradient-to-br from-blue-50 to-blue-100/80 dark:from-blue-900/40 dark:to-blue-800/40';
  }
  return 'bg-white dark:bg-gray-800';
}

interface DaysRowProps {
  /** Ширина контейнера (для варианта swimlanes) */
  containerWidth?: string;
  /** Ширина колонки дня (для варианта occupancy) */
  dayColumnWidth?: number;
  /** По каждому дню — список проблемных задач и причин для тултипа иконки ошибки */
  errorDayDetails?: Map<number, DayErrorDetail[]>;
  /** Индексы дней колонок, в которых есть ошибки планирования — в шапке показывается иконка ошибки */
  errorDayIndices?: Set<number>;
  /** Индексы дней колонок, которые являются нерабочими/праздничными */
  holidayDayIndices?: Set<number>;
  /** Отображать день и дату в две строки в шапке */
  multilineHeader?: boolean;
  /** Высота строки (для варианта occupancy) */
  rowHeight?: number;
  /** Показывать эмодзи праздников в ячейках дней. false = скрыть (для квартального планирования) */
  showHolidayEmoji?: boolean;
  sprintStartDate: Date;
  /** Список задач для поиска taskId по taskName */
  tasks?: Task[];
  /** Вариант отображения: 'swimlanes' для свимлейнов (div), 'occupancy' для занятости (th) */
  variant?: 'occupancy' | 'swimlanes';
  /** Число рабочих дней в таймлайне (по длительности спринта) */
  workingDaysCount?: number;
  /** Callback для изменения hoveredErrorTaskId */
  onHoveredErrorTaskIdChange?: (taskId: string | null) => void;
}

/**
 * Компонент строки дней для заголовка спринта.
 * Используется в свимлейнах (DaysHeader) и в режиме занятости (OccupancyTableHeader).
 */
export function DaysRow({
  sprintStartDate,
  errorDayDetails,
  errorDayIndices,
  variant = 'swimlanes',
  dayColumnWidth,
  rowHeight = 41,
  containerWidth = '100%',
  tasks,
  onHoveredErrorTaskIdChange,
  holidayDayIndices,
  multilineHeader = false,
  showHolidayEmoji,
  workingDaysCount = WORKING_DAYS,
}: DaysRowProps) {
  const now = plannerNowFromMinute(usePlannerNowMinute());
  const dayCount = Math.max(1, workingDaysCount);
  const dayWidthPercent = 100 / dayCount;

  if (variant === 'occupancy') {
    // Вариант для таблицы занятости (th элементы)
    return (
      <>
        {Array.from({ length: dayCount }, (_, dayIndex) => {
          const dayDate = getDayDate(sprintStartDate, dayIndex, dayCount);
          const status = getDayStatus(dayIndex, sprintStartDate, dayCount);
          const hasError = errorDayIndices?.has(dayIndex);
          const details = errorDayDetails?.get(dayIndex);
          const isHoliday = holidayDayIndices?.has(dayIndex);
          const isPast = status === 'past';
          return (
            <th
              key={dayIndex}
              className={`px-2 text-center align-middle relative transition-all duration-200 ${occupancyDayHeaderClass(status, isPast, Boolean(isHoliday))}`}
              style={{
                width: dayColumnWidth ?? `${dayWidthPercent}%`,
                minWidth: dayColumnWidth,
                height: rowHeight,
                minHeight: rowHeight,
                maxHeight: rowHeight,
              }}
            >
              {/* Sticky граница справа - остается на месте при скролле */}
              <div
                className="absolute right-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-600 pointer-events-none"
                style={{ zIndex: 1 }}
              />
              <div
                className="flex items-center justify-center gap-1.5 shrink-0 text-center w-full"
                style={{ height: rowHeight }}
              >
                <DayHeaderCellContent
                  day={dayDate}
                  errorDetails={details}
                  hasError={hasError}
                  multiline={multilineHeader}
                  nonWorking={Boolean(isHoliday)}
                  showHolidayEmoji={showHolidayEmoji}
                  tasks={tasks}
                  variant="timeline"
                  onHoveredErrorTaskIdChange={onHoveredErrorTaskIdChange}
                />
              </div>
            </th>
          );
        })}
      </>
    );
  }

  return (
    <div
      className="grid h-full min-h-0 overflow-hidden"
      data-onboarding="days"
      style={{
        width: containerWidth,
        gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: dayCount }, (_, dayIndex) => {
        const dayDate = getDayDate(sprintStartDate, dayIndex, dayCount);
        const status = getDayStatus(dayIndex, sprintStartDate, dayCount);
        const hasError = errorDayIndices?.has(dayIndex);
        const details = errorDayDetails?.get(dayIndex);
        const isHoliday = holidayDayIndices?.has(dayIndex);
        const dividerClass = timelineDayDividerClass(dayIndex, dayCount);
        const nowWithinDay =
          status === 'today'
            ? plannerNowWithinDay(dayDate, now)
            : null;
        return (
          <div
            key={dayIndex}
            className={`relative flex h-full min-h-0 min-w-0 items-center justify-center overflow-hidden py-1 text-center ${swimlaneDayCellClass(status)}`}
            data-onboarding-day={dayIndex}
            data-onboarding-today={status === 'today' ? 'true' : undefined}
          >
            {nowWithinDay != null ? (
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-0 top-0 z-[1] w-px -translate-x-1/2 bg-blue-500 dark:bg-blue-400"
                style={{ left: `${nowWithinDay * 100}%` }}
              />
            ) : null}
            {dividerClass ? (
              <div
                className={`pointer-events-none absolute bottom-0 right-0 top-0 w-px ${dividerClass}`}
              />
            ) : null}
            <div className="relative z-[2]">
              <DayHeaderCellContent
                day={dayDate}
                errorDetails={details}
                hasError={hasError}
                multiline={multilineHeader}
                nonWorking={Boolean(isHoliday)}
                showHolidayEmoji={showHolidayEmoji}
                variant="timeline"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
