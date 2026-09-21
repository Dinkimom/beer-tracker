import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { fetchIssueStatusesTypesAndSummariesFromSnapshots } from '@/lib/snapshots';

export async function POST(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }

    const body = await request.json();
    const issueKeys: string[] = body.issueKeys;

    if (!Array.isArray(issueKeys) || issueKeys.length === 0) {
      return NextResponse.json(
        { error: 'issueKeys must be a non-empty array' },
        { status: 400 }
      );
    }

    const { statuses, types, summaries } =
      await fetchIssueStatusesTypesAndSummariesFromSnapshots(
        tenantResult.ctx.organizationId,
        issueKeys
      );

    const statusesObj: Record<string, string> = {};
    for (const [key, status] of statuses) statusesObj[key] = status;
    const typesObj: Record<string, string> = {};
    for (const [key, type] of types) typesObj[key] = type;
    const summariesObj: Record<string, string> = {};
    for (const [key, summary] of summaries) summariesObj[key] = summary;

    return NextResponse.json({ statuses: statusesObj, types: typesObj, summaries: summariesObj });
  } catch (error) {
    return handleApiError(error, 'fetch parent statuses');
  }
}
