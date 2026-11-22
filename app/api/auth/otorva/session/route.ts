import { NextResponse } from 'next/server';
import { z } from 'zod';

import { exchangeOtorvaCredentials } from '@/lib/auth/otorvaCredentials';
import { parseJsonRequestBody } from '@/lib/http/parseJsonRequestBody';

const BodySchema = z.object({
  email: z.string().trim().email().max(255),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  mode: z.enum(['login', 'register']),
  password: z.string().min(6).max(200),
});

/**
 * POST /api/auth/otorva/session — встроенный трекер: email и пароль → JWT otorva (токен трекера).
 * Публичный (`/api/auth/`): вход и первичная настройка. Логика — `lib/auth/otorvaCredentials.ts`.
 * Ошибка — `{ code }` (`OtorvaSessionErrorCode`), текст — в словаре интерфейса.
 */
export async function POST(request: Request) {
  const json = await parseJsonRequestBody(request);
  const parsed = json instanceof NextResponse ? null : BodySchema.safeParse(json);
  if (!parsed?.success) {
    return NextResponse.json({ code: 'invalid_input', error: 'invalid_input' }, { status: 400 });
  }
  const result = await exchangeOtorvaCredentials(parsed.data);
  if (!result.ok) {
    // Текст ошибки форма берёт из словаря по коду; `error` — для логов и клиентов без словаря.
    return NextResponse.json({ code: result.code, error: result.code }, { status: result.status });
  }
  return NextResponse.json({ token: result.token });
}
