import { NextResponse } from 'next/server';
import { z } from 'zod';

import { exchangeOtorvaCredentials } from '@/lib/auth/otorvaCredentials';
import { parseJsonRequestBodyWithSchema } from '@/lib/http/parseJsonRequestBody';

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
 */
export async function POST(request: Request) {
  const body = await parseJsonRequestBodyWithSchema(
    request,
    BodySchema,
    'Проверьте email и пароль (не короче 6 символов)'
  );
  if (body instanceof NextResponse) {
    return body;
  }
  const result = await exchangeOtorvaCredentials(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ token: result.token });
}
