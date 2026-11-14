import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { TRACKER_UPSTREAM_FORWARD_STATUSES, handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { getQuarterlyPlan, saveQuarterlyPlan } from '@/lib/quarterlyPlans/quarterlyPlanService';

const QuarterSchema = z.object({
  quarter: z.coerce.number().pipe(z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])),
  year: z.coerce.number().int().min(2000).max(2100),
});

const SaveSchema = QuarterSchema.extend({
  content: z.unknown(),
  ifVersion: z.number().int().min(0),
});

/**
 * GET /api/quarterly-plans?year=&quarter= — план квартала организации: команды, люди, спринты,
 * содержимое и `version` для следующего сохранения.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) return tenantResult.response;
    const ref = QuarterSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!ref.success) {
      return NextResponse.json({ error: 'year and quarter are required' }, { status: 400 });
    }
    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const result = await getQuarterlyPlan({
      issueTracker,
      organizationId: tenantResult.ctx.organizationId,
      ref: ref.data,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'fetch quarterly plan', { forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES });
  }
}

/**
 * PUT /api/quarterly-plans — содержимое плана целиком поверх версии `ifVersion`.
 * План уже сохранил кто-то другой → 409, клиент перечитывает план (QS5).
 */
export async function PUT(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) return tenantResult.response;
    const body = SaveSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return NextResponse.json({ error: 'year, quarter, ifVersion and content are required' }, { status: 400 });
    }
    const result = await saveQuarterlyPlan({
      content: body.data.content,
      ifVersion: body.data.ifVersion,
      organizationId: tenantResult.ctx.organizationId,
      ref: { quarter: body.data.quarter, year: body.data.year },
    });
    if (result.status === 'invalid') return NextResponse.json({ error: result.error }, { status: 400 });
    if (result.status === 'conflict') {
      return NextResponse.json({ error: 'Quarterly plan was changed by someone else' }, { status: 409 });
    }
    return NextResponse.json({ version: result.version });
  } catch (error) {
    return handleApiError(error, 'save quarterly plan');
  }
}
