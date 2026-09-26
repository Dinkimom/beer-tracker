const WORKDAY_START_MIN = 9 * 60;
const WORKDAY_END_MIN = 18 * 60;

/** Та же серая линия, что у обычных дней. z-index держит её поверх штриховки. */
const DAY_DIVIDER_CLASS = 'z-[2] bg-gray-200 dark:bg-gray-600';

/** 1px-разделитель справа от дня. Последний день без линии — её рисует рельс за спринтом. */
export function timelineDayDividerClass(dayIndex: number, dayCount: number): string | null {
  if (dayIndex >= dayCount - 1) return null;
  return DAY_DIVIDER_CLASS;
}

/** Доля рабочего дня 9:00–18:00. До начала дня — 0, после конца — 1. */
export function workdayProgress(now: Date): number {
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes <= WORKDAY_START_MIN) return 0;
  if (minutes >= WORKDAY_END_MIN) return 1;
  return (minutes - WORKDAY_START_MIN) / (WORKDAY_END_MIN - WORKDAY_START_MIN);
}

function isSameCalendarDay(day: Date, now: Date): boolean {
  return (
    day.getFullYear() === now.getFullYear() &&
    day.getMonth() === now.getMonth() &&
    day.getDate() === now.getDate()
  );
}

/**
 * Доля дня для линии «сейчас».
 * Если колонка «сегодня» — это сам календарный день, берём часы 9:00–18:00.
 * Если это понедельник, подставленный вместо выходных, линия в начале дня.
 */
export function plannerNowWithinDay(day: Date, now: Date): number {
  return isSameCalendarDay(day, now) ? workdayProgress(now) : 0;
}

export function plannerNowLineLeftPercent(
  dayIndex: number,
  dayCount: number,
  withinDay: number
): number {
  const count = Math.max(1, dayCount);
  const clamped = Math.min(1, Math.max(0, withinDay));
  return ((dayIndex + clamped) / count) * 100;
}
