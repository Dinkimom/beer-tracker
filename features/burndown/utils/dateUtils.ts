/**
 * Утилиты для работы с датами в контексте берндауна
 */

import { getWorkingDaysRange } from '@/utils/dateUtils';

/**
 * Проверяет, является ли дата выходным днем (суббота или воскресенье)
 */
function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // 0 = воскресенье, 6 = суббота
}

/** Локальный ключ дня YYYY-MM-DD (как dateKey точек бёрндауна). */
export function burndownLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Нерабочий день: суббота/воскресенье или праздник/выходной из календаря организации. */
export function isBurndownNonWorkingDay(
  date: Date,
  holidayDateKeys?: ReadonlySet<string>
): boolean {
  return isWeekend(date) || (holidayDateKeys?.has(burndownLocalDateKey(date)) ?? false);
}

/**
 * Подсчитывает количество рабочих дней между двумя датами (включительно),
 * без выходных и праздников организации.
 */
export function countWorkingDays(
  startDate: Date,
  endDate: Date,
  holidayDateKeys?: ReadonlySet<string>
): number {
  let count = 0;
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    if (!isBurndownNonWorkingDay(current, holidayDateKeys)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Индексы праздников из {@link useHolidayDays} (по пн–пт колонкам от старта) → ключи дат YYYY-MM-DD.
 */
export function holidayIndicesToDateKeys(
  startDate: Date | null,
  workingDaysCount: number,
  holidayIndices: ReadonlySet<number>
): Set<string> {
  const keys = new Set<string>();
  if (!startDate || holidayIndices.size === 0) return keys;
  const days = getWorkingDaysRange(startDate, workingDaysCount);
  for (const index of holidayIndices) {
    const day = days[index];
    if (day) keys.add(burndownLocalDateKey(day));
  }
  return keys;
}
