/**
 * Cron / планировщик: плановый инкрементальный sync по организациям (секрет SYNC_CRON_SECRET).
 */

import { NextResponse } from 'next/server';

import { syncCronSecretFromRequest } from '@/lib/env';
import { handleSyncTick } from '@/lib/sync/handleSyncTick';

export async function POST(request: Request): Promise<NextResponse> {
  const result = await handleSyncTick({ cronSecret: syncCronSecretFromRequest(request) });

  if (!result.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: result.status });
  }

  return NextResponse.json({ ok: true, ...result.body });
}
