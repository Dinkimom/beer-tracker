import { useMemo } from 'react';

import { useHolidayDays } from '@/features/sprint/hooks/useHolidayDays';

import { countWorkingDays, holidayIndicesToDateKeys } from '../utils/dateUtils';

/**
 * Праздники организации (страна из настроек) в окне спринта — ключи дат YYYY-MM-DD
 * для идеальной линии бёрндауна. Источник тот же, что у шапки планера ({@link useHolidayDays}).
 */
export function useBurndownHolidayDateKeys(
  startDateStr: string | undefined,
  endDateStr: string | undefined
): ReadonlySet<string> {
  const { startDate, weekdayCount } = useMemo(() => {
    if (!startDateStr || !endDateStr) return { startDate: null, weekdayCount: 0 };
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { startDate: null, weekdayCount: 0 };
    }
    start.setHours(0, 0, 0, 0);
    return { startDate: start, weekdayCount: countWorkingDays(start, end) };
  }, [startDateStr, endDateStr]);

  const holidayIndices = useHolidayDays(weekdayCount > 0 ? startDate : null, weekdayCount);
  return useMemo(
    () => holidayIndicesToDateKeys(startDate, weekdayCount, holidayIndices),
    [startDate, weekdayCount, holidayIndices]
  );
}
