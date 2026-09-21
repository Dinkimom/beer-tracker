import { NextResponse } from 'next/server';

/**
 * POST /api/auth/login — парольный вход отключён: войдите токеном трекера на /auth-setup.
 */
export function POST() {
  return NextResponse.json(
    {
      error: 'Вход по паролю отключён. Откройте страницу настройки и войдите токеном трекера.',
    },
    { status: 401 }
  );
}
