import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { resolveParams } from '@/lib/nextjs-utils';
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

    const { issueKey } = await resolveParams(params);

    if (!issueKey) {
      return NextResponse.json(
        { error: 'issueKey is required' },
        { status: 400 }
      );
    }

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
