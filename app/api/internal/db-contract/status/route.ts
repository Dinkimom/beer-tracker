import { NextResponse } from 'next/server';

import { collectDbContractStatusReport } from '@/lib/dbContractPreflight';
import { syncCronSecretFromRequest, verifySyncCronSecret } from '@/lib/env';


/**
 * GET /api/internal/db-contract/status
 * Внутренняя диагностика контрактной БД (доступ по SYNC_CRON_SECRET).
 */
export async function GET(request: Request): Promise<NextResponse> {
  const provided = syncCronSecretFromRequest(request);
  if (!verifySyncCronSecret(provided)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const report = await collectDbContractStatusReport();
  return NextResponse.json(report);
}
