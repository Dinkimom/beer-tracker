import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';
import {
  parseReleaseHoroscopeDay,
  type ReleaseHoroscopeDay,
} from '@/lib/releaseHoroscope/releaseHoroscopeDay';

export async function fetchReleaseHoroscopeDay(): Promise<ReleaseHoroscopeDay> {
  const { data } = await getPlannerBeerTrackerApi().get<unknown>('/release-horoscope/day');
  const day = parseReleaseHoroscopeDay(data);
  if (!day) {
    throw new Error('release horoscope response is invalid');
  }
  return day;
}
