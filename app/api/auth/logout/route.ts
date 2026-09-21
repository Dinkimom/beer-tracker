import { NextResponse } from 'next/server';

import { clearAdminActiveOrganizationCookie, clearProductSessionCookie } from '@/lib/auth';

/**
 * POST /api/auth/logout — сбрасывает cookie сессии продукта.
 */
export function POST() {
  const res = NextResponse.json({ ok: true });
  clearProductSessionCookie(res);
  clearAdminActiveOrganizationCookie(res);
  return res;
}
