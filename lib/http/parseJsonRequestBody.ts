import type { z } from 'zod';

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

/**
 * JSON тела, проверенный схемой. Битый JSON — 400 «Некорректное тело запроса», не прошёл схему —
 * 400 с `invalidMessage` (текст для пользователя, без деталей zod).
 */
export async function parseJsonRequestBodyWithSchema<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
  invalidMessage: string
): Promise<NextResponse | z.infer<T>> {
  const json = await parseJsonRequestBody(request);
  if (json instanceof NextResponse) {
    return json;
  }
  const parsed = schema.safeParse(json);
  return parsed.success ? parsed.data : NextResponse.json({ error: invalidMessage }, { status: 400 });
}
