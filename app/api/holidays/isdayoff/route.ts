import { NextRequest, NextResponse } from 'next/server';

const ISDAYOFF_URL = 'https://isdayoff.ru/api/getdata';

/**
 * GET /api/holidays/isdayoff?date1=YYYYMMDD&date2=YYYYMMDD
 * Прокси к isdayoff.ru (один запрос на диапазон), чтобы избежать CORS и лишних вызовов из браузера.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date1 = searchParams.get('date1');
    const date2 = searchParams.get('date2');

    if (!date1 || !date2) {
      return NextResponse.json(
        { error: 'date1 and date2 are required (YYYYMMDD)' },
        { status: 400 }
      );
    }

    const url = `${ISDAYOFF_URL}?date1=${date1}&date2=${date2}&cc=ru&holiday=1`;
    const resp = await fetch(url, {
      headers: { Accept: 'text/plain' },
      next: { revalidate: 86400 }, // кэш на 1 день
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: 'isdayoff request failed' },
        { status: resp.status }
      );
    }

    const text = await resp.text();
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
