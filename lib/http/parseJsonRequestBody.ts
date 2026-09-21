import { NextResponse } from 'next/server';

/**
 * Парсит JSON тела запроса. При ошибке — NextResponse 400.
 */
export async function parseJsonRequestBody(request: Request): Promise<NextResponse | unknown> {
  try {
    return await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
  }
}
