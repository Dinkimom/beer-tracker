import { NextResponse } from 'next/server';

import { requireTenantWithAdminProfile } from '@/lib/api-tenant';
import { verifyOrganizationTrackerTokenForAdmin } from '@/lib/organizations/organizationTrackerConnection';

function parseTrackerVerifyRequestBody(raw: string): {
  jiraEmail?: string;
  oauthToken?: string;
  trackerOrgId?: string;
} {
  const result: { jiraEmail?: string; oauthToken?: string; trackerOrgId?: string } = {};
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
    if (typeof o.jiraEmail === 'string') result.jiraEmail = o.jiraEmail;
  } catch {
    /* пустое или невалидное тело — как раньше, только сохранённые данные */
  }
  return result;
}

/**
 * POST /api/admin/organizations/[organizationId]/tracker/verify
 * org_admin: проверка токена против API трекера (без записи в БД).
 */
export async function POST(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  const auth = await requireTenantWithAdminProfile(request, organizationId);
  if ('response' in auth) {
    return auth.response;
  }

  const raw = await request.text();
  const { jiraEmail, oauthToken, trackerOrgId } = parseTrackerVerifyRequestBody(raw);

  const result = await verifyOrganizationTrackerTokenForAdmin(auth.ctx.organizationId, {
    jiraEmail,
    oauthToken,
    trackerOrgId,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error, ok: false }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
