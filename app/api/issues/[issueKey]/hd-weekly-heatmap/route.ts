import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { buildHdWeeklyHeatmapPayload, formatUtcIsoDateOnly, resolveHdHeatmapRangeStartMs } from '@/lib/overseer/hdWeeklyHeatmap';
import { fetchHdWeeklyCountsByIssueKey } from '@/lib/overseer/hdWeeklyHeatmapRead';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> | { issueKey: string } }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }

    const { issueKey } = await resolveParams(params);
    if (!issueKey?.trim()) {
      return NextResponse.json({ error: 'issueKey is required' }, { status: 400 });
    }

    const createdAt = request.nextUrl.searchParams.get('createdAt') ?? undefined;
    const hdCountRaw = request.nextUrl.searchParams.get('hdCount');
    const hdCount = hdCountRaw != null && hdCountRaw !== '' ? Number(hdCountRaw) : undefined;
    const rangeStart = formatUtcIsoDateOnly(new Date(resolveHdHeatmapRangeStartMs(createdAt, Date.now())));
    const weeklyCounts = await fetchHdWeeklyCountsByIssueKey(issueKey.trim(), rangeStart);
    const payload = buildHdWeeklyHeatmapPayload(
      weeklyCounts,
      createdAt,
      Date.now(),
      Number.isFinite(hdCount) ? Math.max(0, Math.trunc(hdCount!)) : undefined
    );

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error, 'fetch HD weekly heatmap');
  }
}
