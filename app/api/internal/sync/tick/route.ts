/**
 * Cron / планировщик: плановый инкрементальный sync по организациям (секрет SYNC_CRON_SECRET).
 */

import { NextResponse } from 'next/server';

import { handleSyncTick } from '@/lib/sync/handleSyncTick';

export async function POST(request: Request): Promise<NextResponse> {
  const header =
    request.headers.get('x-sync-cron-secret')?.trim() ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ??
    '';
  const result = await handleSyncTick({ cronSecret: header });

  if (!result.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: result.status });
  }

  return NextResponse.json({ ok: true, ...result.body });
}
