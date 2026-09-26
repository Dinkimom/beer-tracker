import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

/** Прокси календаря нерабочих дней: текстовая строка кодов по дням диапазона. */
export async function fetchHolidayIsDayOffRange(
  date1: string,
  date2: string,
  country: string,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get<string>('/holidays/isdayoff', {
      params: { cc: country, date1, date2 },
      responseType: 'text',
      signal,
      transformResponse: [(v) => v],
    });
    return typeof data === 'string' && data ? data : null;
  } catch {
    return null;
  }
}
