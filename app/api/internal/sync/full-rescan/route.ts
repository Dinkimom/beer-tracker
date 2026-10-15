/**
 * Cron / планировщик: полный rescan одной организации inline (секрет SYNC_CRON_SECRET, без Redis).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { handleSyncFullRescan } from '@/lib/sync/handleSyncFullRescan';

/** Долгий прогон: Cloud Scheduler / Cloud Run должны допускать соответствующий HTTP timeout. */
export const maxDuration = 1800;

const BodySchema = z.object({
  organizationId: z.string().uuid(),
});

function extractCronSecret(request: Request): string {
  return (
    request.headers.get('x-sync-cron-secret')?.trim() ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ??
    ''
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Требуется { "organizationId": "<uuid>" }' },
      { status: 400 }
    );
  }

  const result = await handleSyncFullRescan({
    cronSecret: extractCronSecret(request),
    organizationId: parsed.data.organizationId,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        ...(result.retryAfterSeconds != null
          ? { retryAfterSeconds: result.retryAfterSeconds }
          : {}),
        ...(result.syncRunId != null ? { syncRunId: result.syncRunId } : {}),
      },
      { status: result.status }
    );
  }

  return NextResponse.json({ ok: true, ...result.body });
}
