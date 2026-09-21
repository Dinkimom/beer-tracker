import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  assertNoRunningOrQueuedHeavySync,
  assertSyncRedisReady,
  fullRescanCooldownRemaining,
  fullRescanCooldownResponse,
} from '@/lib/admin/adminSyncRouteHelpers';
import { requireOrgAdmin, requireTenantForOrganization } from '@/lib/api-tenant';
import { getSyncPlatformEnv } from '@/lib/env';
import { findOrganizationById } from '@/lib/organizations';
import { enqueueFullRescan } from '@/lib/sync/queue';
import { findLastFullRescanFinishedAt } from '@/lib/sync/syncRunsRepository';

const BodySchema = z.object({
  confirm: z.literal(true),
});

/**
 * POST /api/admin/organizations/[organizationId]/sync/full-rescan
 * org_admin: confirm + cooldown + без конфликтующих прогонов → full_rescan в очередь.
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

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Требуется { "confirm": true } для подтверждения полной ресинхронизации' },
      { status: 400 }
    );
  }

  const org = await findOrganizationById(auth.ctx.organizationId);
  if (!org) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
  }

  const redisDenied = assertSyncRedisReady();
  if (redisDenied) {
    return redisDenied;
  }

  const conflict = await assertNoRunningOrQueuedHeavySync(
    org.id,
    'Полная синхронизация уже в очереди или выполняется'
  );
  if (conflict) {
    return conflict;
  }

  const platform = getSyncPlatformEnv();
  const lastFull = await findLastFullRescanFinishedAt(org.id);
  const remainMs = fullRescanCooldownRemaining({
    cooldownMinutes: platform.fullRescanCooldownMinutes,
    lastFullRescanFinishedAt: lastFull,
  });
  if (remainMs > 0) {
    return fullRescanCooldownResponse(remainMs);
  }

  const job = await enqueueFullRescan(org.id, auth.ctx.userId);
  return NextResponse.json({ jobId: job.id, ok: true });
}
