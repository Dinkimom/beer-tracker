import { NextRequest, NextResponse } from 'next/server';

import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { fetchFeatureLanes, mergePreservedFeatureLaneIssueKeys, upsertFeatureLanes } from '@/lib/sprints';
import { mergeFeatureLanesDocuments } from '@/lib/sprints/featureLanesMerge';
import { requireSprintRouteContext } from '@/lib/sprints/sprintRouteContext';
import { FeatureLanesSaveSchema, formatValidationError, validateRequest } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
) {
  try {
    const tenantResult = await requireSprintRouteContext(request, params);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { sprintId } = tenantResult;

    const lanes = await fetchFeatureLanes({
      organizationId: tenantResult.ctx.organizationId,
      sprintId,
    });
    return NextResponse.json({ lanes: lanes ?? null });
  } catch (error) {
    console.error('[GET /feature-lanes] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch feature lanes' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
) {
  try {
    const tenantResult = await requireSprintRouteContext(request, params);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { sprintId } = tenantResult;

    const parsed = validateRequest(FeatureLanesSaveSchema, await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: formatValidationError(parsed.error) }, { status: 400 });
    }

    const existing = await fetchFeatureLanes({
      organizationId: tenantResult.ctx.organizationId,
      sprintId,
    });
    const { base, ...incoming } = parsed.data;
    // Вкладка правила от `base`; то, что сервер получил с тех пор (перенос фичи), не затираем.
    const merged = base && existing ? mergeFeatureLanesDocuments(base, incoming, existing) : incoming;
    const lanes = mergePreservedFeatureLaneIssueKeys(existing, merged);
    await upsertFeatureLanes({
      lanes,
      organizationId: tenantResult.ctx.organizationId,
      sprintId,
    });
    notifySprintRealtime(request, tenantResult.ctx.organizationId, sprintId, ['featureLanes']);
    return NextResponse.json({ lanes, success: true });
  } catch (error) {
    console.error('[PUT /feature-lanes] Error:', error);
    return NextResponse.json({ error: 'Failed to save feature lanes' }, { status: 500 });
  }
}
