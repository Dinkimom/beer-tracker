import {
  parseReleaseHoroscopeDay,
  type ReleaseHoroscopeDay,
} from '@/lib/releaseHoroscope/releaseHoroscopeDay';

const RELEASE_HOROSCOPE_DAY_URL = 'https://deployhoroscope.ru/api/v1/day';
const REVALIDATE_SECONDS = 3600;

/**
 * Дневной гороскоп релизов: все знаки, символ зодиака и текст.
 * Прокси нужен, потому что браузер не ходит на deployhoroscope.ru из-за CORS.
 */
export async function fetchReleaseHoroscopeDay(): Promise<ReleaseHoroscopeDay | null> {
  const resp = await fetch(RELEASE_HOROSCOPE_DAY_URL, {
    headers: { Accept: 'application/json' },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!resp.ok) return null;
  const payload: unknown = await resp.json();
  return parseReleaseHoroscopeDay(payload);
}
