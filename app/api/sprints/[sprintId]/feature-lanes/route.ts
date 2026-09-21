import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { fetchFeatureLanes, mergePreservedFeatureLaneIssueKeys, upsertFeatureLanes } from '@/lib/sprints';
import { FeatureLanesDocumentSchema, formatValidationError, validateRequest } from '@/lib/validation';

async function readSprintId(
  params: Promise<{ sprintId: string }> | { sprintId: string }
): Promise<number | null> {
  const { sprintId: sprintIdStr } = await resolveParams(params);
  const sprintId = parseInt(sprintIdStr, 10);
  return Number.isNaN(sprintId) ? null : sprintId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const sprintId = await readSprintId(params);
    if (sprintId == null) {
      return NextResponse.json({ error: 'Invalid sprint ID' }, { status: 400 });
    }

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
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const sprintId = await readSprintId(params);
    if (sprintId == null) {
      return NextResponse.json({ error: 'Invalid sprint ID' }, { status: 400 });
    }

    const parsed = validateRequest(FeatureLanesDocumentSchema, await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: formatValidationError(parsed.error) }, { status: 400 });
    }

    const existing = await fetchFeatureLanes({
      organizationId: tenantResult.ctx.organizationId,
      sprintId,
    });
    const lanes = mergePreservedFeatureLaneIssueKeys(existing, parsed.data);
    await upsertFeatureLanes({
      lanes,
      organizationId: tenantResult.ctx.organizationId,
      sprintId,
    });
    return NextResponse.json({ lanes, success: true });
  } catch (error) {
    console.error('[PUT /feature-lanes] Error:', error);
    return NextResponse.json({ error: 'Failed to save feature lanes' }, { status: 500 });
  }
}
