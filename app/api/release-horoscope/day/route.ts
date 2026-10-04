import { NextResponse } from 'next/server';

import { fetchReleaseHoroscopeDay } from '@/lib/releaseHoroscope/fetchReleaseHoroscopeDay';

export const revalidate = 3600;

/**
 * GET /api/release-horoscope/day
 * Прокси дневного гороскопа релизов (deployhoroscope.ru).
 */
export async function GET() {
  try {
    const day = await fetchReleaseHoroscopeDay();
    if (!day) {
      return NextResponse.json({ error: 'Failed to fetch release horoscope' }, { status: 502 });
    }
    return NextResponse.json(day);
  } catch (error) {
    console.error('[api/release-horoscope/day] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch release horoscope' }, { status: 500 });
  }
}
