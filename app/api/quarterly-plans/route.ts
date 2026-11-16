import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { TRACKER_UPSTREAM_FORWARD_STATUSES, handleApiError } from '@/lib/api-error-handler';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { QuarterRefSchema } from '@/lib/quarterlyPlans/quarterlyPlanContentParse';
import { requireQuarterBody, requireQuarterQuery } from '@/lib/quarterlyPlans/quarterlyPlanRouteHelpers';
import { getQuarterlyPlan, saveQuarterlyPlan } from '@/lib/quarterlyPlans/quarterlyPlanService';
import { IssueKeyParamSchema } from '@/lib/validation';

const SaveSchema = QuarterRefSchema.extend({
  content: z.unknown(),
  ifVersion: z.number().int().min(0),
});

/**
 * GET /api/quarterly-plans?year=&quarter= — план квартала организации: команды, люди, спринты,
 * содержимое и `version` для следующего сохранения. `refresh=<ключ>` — задаче только что сменили статус:
 * её строка читается из трекера заново.
 */
export async function GET(request: NextRequest) {
  try {
    const route = await requireQuarterQuery(request);
    if ('response' in route) return route.response;
    const refresh = IssueKeyParamSchema.safeParse({ issueKey: request.nextUrl.searchParams.get('refresh') });
    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const result = await getQuarterlyPlan({
      issueTracker,
      organizationId: route.ctx.organizationId,
      ref: route.input,
      refreshIssueKey: refresh.success ? refresh.data.issueKey : undefined,
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
    const route = await requireQuarterBody(request, SaveSchema, 'year, quarter, ifVersion and content are required');
    if ('response' in route) return route.response;
    const { content, ifVersion, quarter, year } = route.input;
    const result = await saveQuarterlyPlan({
      authorId: route.ctx.userId,
      content,
      ifVersion,
      organizationId: route.ctx.organizationId,
      ref: { quarter, year },
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
