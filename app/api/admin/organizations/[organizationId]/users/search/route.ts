import { NextResponse } from 'next/server';

import { handleApiError, TRACKER_UPSTREAM_FORWARD_STATUSES } from '@/lib/api-error-handler';
import { requireOrgAdmin, requireTenantForOrganization } from '@/lib/api-tenant';
import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';

/**
 * GET /api/admin/organizations/[organizationId]/users/search?q=...
 * org_admin: поиск пользователей в подключённом трекере (по токену организации).
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  const auth = await requireTenantForOrganization(request, organizationId);
  if (auth.response) return auth.response;
  const denied = requireOrgAdmin(auth.ctx);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  try {
    const issueTracker = await getIssueTrackerProviderClientForOrganization(
      auth.ctx.organizationId
    );
    const items = await issueTracker.searchUsers(q);
    return NextResponse.json({ items });
  } catch (error) {
    return handleApiError(error, 'admin tracker users search', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
