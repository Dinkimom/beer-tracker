import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { resolveIssueRouteParams } from '@/lib/issues/issueRouteParams';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import {
  fetchIssueChangelogCacheMap,
  upsertIssueChangelogCacheRow,
} from '@/lib/snapshots';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> | { issueKey: string } }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId } = tenantResult.ctx;

    const issueRoute = await resolveIssueRouteParams(params);
    if ('response' in issueRoute) {
      return issueRoute.response;
    }
    const { issueKey } = issueRoute;

    const refresh = request.nextUrl.searchParams.get('refresh') === '1';
    const cacheMap = await fetchIssueChangelogCacheMap(organizationId, [
      issueKey,
    ]);

    if (!refresh && cacheMap.has(issueKey)) {
      return NextResponse.json(cacheMap.get(issueKey)!);
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const data = await issueTracker.getIssueChangelogWithComments(issueKey);
    await upsertIssueChangelogCacheRow(organizationId, issueKey, data);

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, 'fetch issue changelog');
  }
}
