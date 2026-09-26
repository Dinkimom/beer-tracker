import { NextRequest, NextResponse } from 'next/server';

import { fetchHolidayDayCodes } from '@/lib/holidays/fetchHolidayDayCodes';
import {
  DEFAULT_HOLIDAY_COUNTRY,
  isHolidayCountryCode,
} from '@/lib/holidays/holidayCountries';
import { isCompactDateRange } from '@/lib/holidays/holidayDayCodes';

/**
 * GET /api/holidays/isdayoff?date1=YYYYMMDD&date2=YYYYMMDD&cc=ru
 * Прокси календаря нерабочих дней: isdayoff для производственного календаря,
 * Nager.Date для публичных праздников остальных стран.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date1 = searchParams.get('date1') ?? '';
    const date2 = searchParams.get('date2') ?? '';
    const country = (searchParams.get('cc') ?? DEFAULT_HOLIDAY_COUNTRY).toLowerCase();

    if (!isCompactDateRange(date1, date2)) {
      return NextResponse.json(
        { error: 'date1 and date2 are required (YYYYMMDD), date2 >= date1, span <= 366 days' },
        { status: 400 }
      );
    }
    if (!isHolidayCountryCode(country)) {
      return NextResponse.json({ error: 'unsupported country code' }, { status: 400 });
    }

    const text = await fetchHolidayDayCodes(date1, date2, country);
    if (!text) {
      return NextResponse.json({ error: 'Failed to fetch holiday data' }, { status: 502 });
    }

    return new NextResponse(text, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('[api/holidays/isdayoff] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holiday data' },
      { status: 500 }
    );
  }
}
