'use client';

import type { DayErrorDetail } from '@/features/sprint/utils/occupancyValidation';
import type { Task } from '@/types';

import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { DayErrorIndicator } from '@/features/sprint/components/DayErrorIndicator';
import { useShowHolidaysStorage } from '@/hooks/useLocalStorage';
import { useOrgHolidayCountry } from '@/hooks/useOrgHolidayCountry';
import { getHolidayForDate } from '@/lib/holidays';
import { isPlannerToday } from '@/utils/dateUtils';
import { getPlannerNow } from '@/utils/plannerClock';

/**
 * Общий компонент ячейки дня для заголовка таймлайна (свимлейн и занятость).
 * У всех дней одна структура: «Чт 15.10» у левого края колонки; «сегодня» — синий текст (колонку подсвечивает родитель).
 */

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

type DayTone = 'future' | 'past' | 'today';

const WEEKDAY_TONE_CLASS: Record<DayTone, string> = {
  future: 'text-gray-500 dark:text-gray-400',
  past: 'text-gray-400 dark:text-gray-500',
  today: 'text-blue-600 dark:text-blue-400',
};

const NUMBER_TONE_CLASS: Record<DayTone, string> = {
  future: 'text-gray-900 dark:text-gray-100',
  past: 'text-gray-400 dark:text-gray-500',
  today: 'text-blue-600 dark:text-blue-400',
};

function formatDateDDMM(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}`;
}

function isPastDay(date: Date): boolean {
  const today = getPlannerNow();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

function dayTone(date: Date): DayTone {
  if (isPlannerToday(date)) return 'today';
  return isPastDay(date) ? 'past' : 'future';
}

interface DayHeaderCellContentProps {
  day: Date;
  /** Список проблемных задач и причин для тултипа иконки ошибки в этом дне */
  errorDetails?: DayErrorDetail[];
  /** В этом дне есть ошибки планирования — показывается иконка рядом с датой */
  hasError?: boolean;
  /** Отображать день и дату в две строки (для квартального планирования) */
  multiline?: boolean;
  /** Будний день выходного или праздничного календаря */
  nonWorking?: boolean;
  /** Явно отключить эмодзи праздников (для квартального планирования). Если не задано — используется настройка из хранилища */
  showHolidayEmoji?: boolean;
  /** Список задач для поиска taskId по taskName */
  tasks?: Task[];
  /** Вариант цветов: timeline (серый прошлое) или occupancy (серый прошлое) */
  variant?: 'occupancy' | 'timeline';
  /** Callback для изменения hoveredErrorTaskId */
  onHoveredErrorTaskIdChange?: (taskId: string | null) => void;
}

/**
 * Содержимое ячейки дня: «Пн 26.01», сегодня — синим.
 * Родитель задаёт обёртку (th) и высоту.
 */
export function DayHeaderCellContent({
  day,
  variant: _variant = 'timeline',
  errorDetails,
  hasError,
  tasks,
  onHoveredErrorTaskIdChange,
  multiline = false,
  nonWorking = false,
  showHolidayEmoji,
}: DayHeaderCellContentProps) {
  const { t } = useI18n();
  const [showHolidaysStorage] = useShowHolidaysStorage();
  const { holidayCountry } = useOrgHolidayCountry();
  const showHolidays = showHolidayEmoji !== undefined ? showHolidayEmoji : showHolidaysStorage;
  const tone = dayTone(day);

  const holiday =
    showHolidays && holidayCountry === 'ru' ? getHolidayForDate(day) : null;
  const holidayCaption = holiday ? t(holiday.captionKey) : '';
  const dayLabel = t(`common.weekdays.${WEEKDAY_KEYS[day.getDay()]}`);
  const nonWorkingLabel = t('common.nonWorkingDay');

  const weekday = (
    <span className={`font-normal ${WEEKDAY_TONE_CLASS[tone]}`}>{dayLabel}</span>
  );
  const dayNumber = (
    <span
      className={`font-semibold tabular-nums ${NUMBER_TONE_CLASS[tone]}`}
    >
      {formatDateDDMM(day)}
    </span>
  );
  const nonWorkingCaption = nonWorking ? (
    <span className="min-w-0 truncate text-xs font-normal text-gray-400 dark:text-gray-500">
      {nonWorkingLabel}
    </span>
  ) : null;

  const dateBlock = multiline ? (
    <span className="inline-flex min-w-0 flex-col items-center gap-0.5">
      {weekday}
      {dayNumber}
      {nonWorkingCaption}
    </span>
  ) : (
    <>
      {weekday}
      {dayNumber}
      {nonWorkingCaption}
    </>
  );

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] leading-none">
      {dateBlock}
      {holiday && (
        <TextTooltip content={holidayCaption} delayDuration={150} side="bottom">
          <span
            aria-label={holidayCaption}
            className="inline-flex shrink-0 cursor-pointer text-base leading-none transition-transform duration-150 hover:scale-125"
            role="img"
          >
            {holiday.emoji}
          </span>
        </TextTooltip>
      )}
      {hasError && (
        <DayErrorIndicator
          errorDetails={errorDetails}
          tasks={tasks}
          onHoveredErrorTaskIdChange={onHoveredErrorTaskIdChange}
        />
      )}
    </span>
  );
}
