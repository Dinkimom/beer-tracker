'use client';

import type { DayErrorDetail } from '@/features/sprint/utils/occupancyValidation';

import { DayHeaderCellContent } from '@/components/DayHeaderCell';
import { WORKING_DAYS } from '@/constants';
import {
  TIMELINE_TODAY_COLUMN_TINT_CLASS,
  timelineDayDividerClass,
} from '@/features/sprint/utils/timelineColumnChrome';
import { getDayDate } from '@/lib/planner-timeline/occupancyUtils';
import { getDayStatus, isPlannerToday } from '@/utils/dateUtils';

interface DaysRowProps {
  /** Ширина контейнера */
  containerWidth?: string;
  /** По каждому дню — список проблемных задач и причин для тултипа иконки ошибки */
  errorDayDetails?: Map<number, DayErrorDetail[]>;
  /** Индексы дней колонок, в которых есть ошибки планирования — в шапке показывается иконка ошибки */
  errorDayIndices?: Set<number>;
  /** Индексы дней колонок, которые являются нерабочими/праздничными */
  holidayDayIndices?: Set<number>;
  /** Отображать день и дату в две строки в шапке */
  multilineHeader?: boolean;
  /** Показывать эмодзи праздников в ячейках дней. false = скрыть (для квартального планирования) */
  showHolidayEmoji?: boolean;
  sprintStartDate: Date;
  /** Число рабочих дней в таймлайне (по длительности спринта) */
  workingDaysCount?: number;
}

/**
 * Строка дней в заголовке спринта над свимлейнами (DaysHeader).
 */
export function DaysRow({
  sprintStartDate,
  errorDayDetails,
  errorDayIndices,
  containerWidth = '100%',
  holidayDayIndices,
  multilineHeader = false,
  showHolidayEmoji,
  workingDaysCount = WORKING_DAYS,
}: DaysRowProps) {
  const dayCount = Math.max(1, workingDaysCount);

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
        const isToday = isPlannerToday(dayDate);
        return (
          <div
            key={dayIndex}
            className="relative flex h-full min-h-0 min-w-0 items-center justify-start overflow-hidden px-3 py-1"
            data-onboarding-day={dayIndex}
            data-onboarding-today={status === 'today' ? 'true' : undefined}
          >
            {isToday ? (
              <div className={TIMELINE_TODAY_COLUMN_TINT_CLASS} />
            ) : null}
            {dividerClass ? (
              <div
                className={`pointer-events-none absolute bottom-0 right-0 top-0 w-px ${dividerClass}`}
              />
            ) : null}
            <div className="relative z-[2] flex min-w-0">
              <DayHeaderCellContent
                day={dayDate}
                errorDetails={details}
                hasError={hasError}
                multiline={multilineHeader}
                nonWorking={Boolean(isHoliday)}
                showHolidayEmoji={showHolidayEmoji}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
