import { NextResponse } from 'next/server';

import { requireOrgAdmin, requireTenantForOrganization } from '@/lib/api-tenant';
import { findOrganizationById } from '@/lib/organizations';
import {
  hasPendingHeavySyncInRedis,
  listRedisSyncJobsForOrganization,
} from '@/lib/sync/listRedisSyncJobsForOrganization';
import { enqueueIncrementalSync } from '@/lib/sync/queue';
import { isSyncRedisConfigured } from '@/lib/sync/redisConnection';
import { findRunningSyncRunForOrganization } from '@/lib/sync/syncRunsRepository';

/**
 * POST /api/admin/organizations/[organizationId]/sync/incremental
 * org_admin: поставить job incremental (без конфликта с полным прогоном / running в PG).
 */
export async function POST(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  const auth = await requireTenantForOrganization(request, organizationId);
  if (auth.response) {
    return auth.response;
  }
  const denied = requireOrgAdmin(auth.ctx);
  if (denied) {
    return denied;
  }

  const org = await findOrganizationById(auth.ctx.organizationId);
  if (!org) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
  }
  if (!org.initial_sync_completed_at) {
    return NextResponse.json(
      { error: 'Сначала завершите первичную синхронизацию' },
      { status: 400 }
    );
  }
  if (!isSyncRedisConfigured()) {
    return NextResponse.json({ error: 'Redis не настроен (REDIS_URL)' }, { status: 503 });
  }

  const running = await findRunningSyncRunForOrganization(org.id);
  if (running) {
    return NextResponse.json(
      { error: 'Уже выполняется синхронизация', syncRunId: running.id },
      { status: 409 }
    );
  }

  const redisJobs = await listRedisSyncJobsForOrganization(org.id);
  if (hasPendingHeavySyncInRedis(redisJobs)) {
    return NextResponse.json(
      { error: 'В очереди полная синхронизация — дождитесь её завершения' },
      { status: 409 }
    );
  }

  const job = await enqueueIncrementalSync(org.id);
  return NextResponse.json({ jobId: job.id, ok: true });
}
