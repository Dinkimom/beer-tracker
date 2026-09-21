import { NextResponse } from 'next/server';

import { requireTenantForOrganization } from '@/lib/api-tenant';
import { jiraEmailFromRequest } from '@/lib/issueTrackerProvider/jiraBasicAuthEmail';
import { verifyOrganizationTrackerTokenForAdmin } from '@/lib/organizations/organizationTrackerConnection';

function parseTrackerVerifyRequestBody(raw: string): {
  oauthToken?: string;
  trackerOrgId?: string;
} {
  const result: { oauthToken?: string; trackerOrgId?: string } = {};
  if (!raw.trim()) {
    return result;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return result;
    }
    const o = parsed as Record<string, unknown>;
    if (typeof o.oauthToken === 'string') result.oauthToken = o.oauthToken;
    if (typeof o.trackerOrgId === 'string') result.trackerOrgId = o.trackerOrgId;
  } catch {
    /* пустое или невалидное тело — как раньше, только сохранённые данные */
  }
  return result;
}

/**
 * POST /api/admin/organizations/[organizationId]/tracker/verify
 * Участник организации: проверка токена против API трекера (без записи в БД).
 * Тело JSON опционально: `{ "oauthToken"?: string, "trackerOrgId"?: string }` — значения из формы до «Сохранить».
 * Без тела или с пустыми полями используются сохранённые org id и токен.
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

  const raw = await request.text();
  const { oauthToken, trackerOrgId } = parseTrackerVerifyRequestBody(raw);

  const result = await verifyOrganizationTrackerTokenForAdmin(auth.ctx.organizationId, {
    jiraEmail: jiraEmailFromRequest(request),
    oauthToken,
    trackerOrgId,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error, ok: false }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
