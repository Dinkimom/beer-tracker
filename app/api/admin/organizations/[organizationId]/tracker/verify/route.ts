import type { VerifyOrganizationTrackerTokenOptions } from '@/lib/organizations/organizationTrackerConnection';

import { NextResponse } from 'next/server';

import { requireTenantWithAdminProfile } from '@/lib/api-tenant';
import { isIssueTrackerProviderKind } from '@/lib/issueTrackerProvider/registry';
import { verifyOrganizationTrackerTokenForAdmin } from '@/lib/organizations/organizationTrackerConnection';

function parseTrackerVerifyRequestBody(raw: string): VerifyOrganizationTrackerTokenOptions {
  const result: VerifyOrganizationTrackerTokenOptions = {};
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
    if (isIssueTrackerProviderKind(o.provider)) result.provider = o.provider;
    if (typeof o.trackerApiBaseUrl === 'string') result.trackerApiBaseUrl = o.trackerApiBaseUrl;
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
  const result = await verifyOrganizationTrackerTokenForAdmin(
    auth.ctx.organizationId,
    parseTrackerVerifyRequestBody(raw)
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error, ok: false }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
