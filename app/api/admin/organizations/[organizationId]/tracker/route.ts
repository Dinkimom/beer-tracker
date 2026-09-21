import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireTenantForOrganization } from '@/lib/api-tenant';
import { invalidateCache } from '@/lib/cache';
import { jiraEmailFromRequest } from '@/lib/issueTrackerProvider/jiraBasicAuthEmail';
import {
  connectOrganizationTracker,
  getOrganizationTrackerAdminFormState,
} from '@/lib/organizations/organizationTrackerConnection';

const BodySchema = z.object({
  oauthToken: z.string().optional(),
  trackerApiBaseUrl: z.string().max(512).optional().nullable(),
  trackerOrgId: z.string().max(256).optional(),
});

/**
 * GET /api/admin/organizations/[organizationId]/tracker
 * Участник организации: сохранённые Cloud Org ID, URL API (без секретов), флаг «токен уже в БД».
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  const auth = await requireTenantForOrganization(request, organizationId);
  if (auth.response) {
    return auth.response;
  }

  const state = await getOrganizationTrackerAdminFormState(auth.ctx.organizationId);
  if (!state) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
  }
  return NextResponse.json(state);
}

/**
 * POST /api/admin/organizations/[organizationId]/tracker
 * Участник организации: проверка в трекере → сохранение URL/org id и при необходимости токена → initial_full.
 * Пустой oauthToken: используется сохранённый токен (если менялись только org id / URL).
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

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Некорректное тело запроса' },
      { status: 400 }
    );
  }

  const result = await connectOrganizationTracker({
    jiraEmail: jiraEmailFromRequest(request),
    oauthToken: parsed.data.oauthToken ?? '',
    organizationId: auth.ctx.organizationId,
    trackerApiBaseUrl: parsed.data.trackerApiBaseUrl,
    trackerOrgId: parsed.data.trackerOrgId ?? '',
    userId: auth.ctx.userId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  invalidateCache.adminTrackerCatalogQueuesBoards(auth.ctx.organizationId);

  return NextResponse.json({
    success: true,
    syncJobEnqueued: result.syncJobEnqueued,
    syncJobWarning: result.syncJobWarning,
    unchanged: result.unchanged === true,
  });
}
