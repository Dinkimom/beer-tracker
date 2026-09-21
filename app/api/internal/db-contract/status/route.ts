import { NextResponse } from 'next/server';

import { collectDbContractStatusReport } from '@/lib/dbContractPreflight';
import { verifySyncCronSecret } from '@/lib/env';

function extractSecret(request: Request): string {
  return (
    request.headers.get('x-sync-cron-secret')?.trim() ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ??
    ''
  );
}

/**
 * GET /api/internal/db-contract/status
 * Внутренняя диагностика контрактной БД (доступ по SYNC_CRON_SECRET).
 */
export async function GET(request: Request): Promise<NextResponse> {
  const provided = extractSecret(request);
  if (!verifySyncCronSecret(provided)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const report = await collectDbContractStatusReport();
  return NextResponse.json(report);
}
