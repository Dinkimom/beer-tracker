'use client';

import type { DayErrorDetail } from '@/features/sprint/utils/occupancyValidation';
import type { Task } from '@/types';

import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { DayErrorIndicator } from '@/features/sprint/components/DayErrorIndicator';
import { useHolidayCountryStorage, useShowHolidaysStorage } from '@/hooks/useLocalStorage';
import { getHolidayForDate } from '@/lib/holidays';

/**
 * Общий компонент ячейки дня для заголовка таймлайна (свимлейн и занятость).
 * День и дата в одну строку, единая высота строки.
 */

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function formatDateDDMM(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isPastDay(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

function dayHeaderTextClasses(today: boolean, past: boolean): string {
  if (today) {
    return 'text-blue-700 dark:text-blue-300 font-semibold';
  }
  if (past) {
    return 'text-gray-400 dark:text-gray-500 font-medium';
  }
  return 'text-gray-700 dark:text-gray-300 font-medium';
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
 * Содержимое ячейки дня: «Пн 26.01» в одну строку, индикатор «сегодня».
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
  const [holidayCountry] = useHolidayCountryStorage();
  const showHolidays = showHolidayEmoji !== undefined ? showHolidayEmoji : showHolidaysStorage;
  const today = isToday(day);
  const past = isPastDay(day);
  const textClasses = dayHeaderTextClasses(today, past);

  const holiday =
    showHolidays && holidayCountry === 'ru' ? getHolidayForDate(day) : null;
  const holidayCaption = holiday ? t(holiday.captionKey) : '';
  const dayLabel = t(`common.weekdays.${WEEKDAY_KEYS[day.getDay()]}`);
  const nonWorkingLabel = t('common.nonWorkingDay');

  const dateLine = multiline ? (
    <span className="flex flex-col leading-tight text-center">
      <span>{dayLabel}</span>
      <span>{formatDateDDMM(day)}</span>
    </span>
  ) : (
    <span>
      {dayLabel} {formatDateDDMM(day)}
    </span>
  );

  return (
    <span className={`text-xs inline-flex items-center justify-center gap-1 ${textClasses}`}>
      <span className="inline-flex min-w-0 flex-col items-center gap-0.5">
        {dateLine}
        {nonWorking ? (
          <span className="max-w-full truncate text-[10px] font-normal leading-none text-gray-400 dark:text-gray-500">
            {nonWorkingLabel}
          </span>
        ) : null}
      </span>
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
      {today && (
        <span
          aria-hidden
          className="inline-block w-2 h-2 bg-blue-600 rounded-full animate-pulse shrink-0"
        />
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
