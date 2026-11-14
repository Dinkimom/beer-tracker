import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { handleApiError } from '@/lib/api-error-handler';
import { QuarterRefSchema } from '@/lib/quarterlyPlans/quarterlyPlanContentParse';
import {
  approveQuarterlyPlanDraft,
  loadQuarterlyPlanDraft,
  rejectQuarterlyPlanDraft,
} from '@/lib/quarterlyPlans/quarterlyPlanDrafts';
import { requireQuarterBody, requireQuarterQuery } from '@/lib/quarterlyPlans/quarterlyPlanRouteHelpers';

const DecisionSchema = QuarterRefSchema.extend({ proposalId: z.string().min(1).max(32) });
const DECISION_REQUIRED = 'year, quarter and proposalId are required';

/** GET /api/quarterly-plans/draft?year=&quarter= — свой черновик агента, применённый к текущему плану (QM9). */
export async function GET(request: NextRequest) {
  try {
    const route = await requireQuarterQuery(request);
    if ('response' in route) return route.response;
    const draft = await loadQuarterlyPlanDraft({
      organizationId: route.ctx.organizationId,
      ownerId: route.ctx.userId,
      ref: route.input,
    });
    return NextResponse.json({ draft });
  } catch (error) {
    return handleApiError(error, 'fetch quarterly plan draft');
  }
}

/** POST — принять черновик целиком: операции применяются к текущему плану (QM10). */
export async function POST(request: NextRequest) {
  try {
    const route = await requireQuarterBody(request, DecisionSchema, DECISION_REQUIRED);
    if ('response' in route) return route.response;
    const { proposalId, ...ref } = route.input;
    const result = await approveQuarterlyPlanDraft({
      organizationId: route.ctx.organizationId,
      ownerId: route.ctx.userId,
      proposalId,
      ref,
    });
    if (result.status === 'invalid') return NextResponse.json({ error: result.error }, { status: 422 });
    if (result.status === 'conflict') return NextResponse.json({ error: 'The plan changed, try again' }, { status: 409 });
    return NextResponse.json({ version: result.version });
  } catch (error) {
    return handleApiError(error, 'approve quarterly plan draft');
  }
}

/** DELETE — отклонить черновик: план не меняется (QM10). */
export async function DELETE(request: NextRequest) {
  try {
    const route = await requireQuarterBody(request, DecisionSchema, DECISION_REQUIRED);
    if ('response' in route) return route.response;
    const { proposalId, ...ref } = route.input;
    const deleted = await rejectQuarterlyPlanDraft({
      organizationId: route.ctx.organizationId,
      ownerId: route.ctx.userId,
      proposalId,
      ref,
    });
    return NextResponse.json({ deleted });
  } catch (error) {
    return handleApiError(error, 'reject quarterly plan draft');
  }
}
