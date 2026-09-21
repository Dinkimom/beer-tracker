/**
 * Обязательная сессия продукта для API route handlers.
 */

import { NextResponse } from 'next/server';

import { getProductUserIdFromRequest } from './productSession';

type RequireProductSessionResult =
  | { response: NextResponse; userId?: never }
  | { response?: never; userId: string };

export function requireProductSession(request: Request): RequireProductSessionResult {
  const userId = getProductUserIdFromRequest(request);
  if (!userId) {
    return {
      response: NextResponse.json({ error: 'Требуется вход' }, { status: 401 }),
    };
  }
  return { userId };
}
