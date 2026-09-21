import type { NextResponse } from 'next/server';

import { resolveAuthCookieSecure } from './cookieSecure';

/** HttpOnly cookie: устаревший выбор org в админке (path /admin); очищается при logout. */
const ADMIN_ACTIVE_ORGANIZATION_COOKIE = 'bt_admin_organization_id';

function cookieBase() {
  return {
    httpOnly: true,
    path: '/admin',
    sameSite: 'lax' as const,
    secure: resolveAuthCookieSecure(),
  };
}

export function clearAdminActiveOrganizationCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_ACTIVE_ORGANIZATION_COOKIE, '', {
    ...cookieBase(),
    maxAge: 0,
  });
}
