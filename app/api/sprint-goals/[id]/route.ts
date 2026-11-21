import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { runAsBoardActor, uiBoardActor, type BoardEventActor } from '@/lib/boardHistory/boardEventActor';
import { resolveParams } from '@/lib/nextjs-utils';
import {
  deleteSprintGoal,
  resolveSprintGoalPlanRow,
  syncSprintGoalsToTrackerFromRequest,
  toSprintGoalItem,
  updateSprintGoal,
  type SprintGoalPatch,
} from '@/lib/sprintGoals';

interface GoalRouteParams { params: Promise<{ id: string }> | { id: string } }

/** Организация и id цели из запроса; иначе готовый ответ с ошибкой. */
async function goalRouteContext(
  request: NextRequest,
  context: GoalRouteParams
): Promise<{ actor: BoardEventActor; id: string; organizationId: string } | { response: NextResponse }> {
  const tenantResult = await requireTenantContext(request);
  if (!('ctx' in tenantResult)) {
    return { response: tenantResult.response };
  }
  const { id } = await resolveParams(context.params);
  if (!id) {
    return { response: NextResponse.json({ error: 'Goal id is required' }, { status: 400 }) };
  }
  return { actor: uiBoardActor(tenantResult.ctx.userId), id, organizationId: tenantResult.ctx.organizationId };
}

/** PATCH: обновить цель (text, checked и/или planRow) */
export async function PATCH(
  request: NextRequest,
  context: GoalRouteParams
) {
  try {
    const goal = await goalRouteContext(request, context);
    if ('response' in goal) return goal.response;
    const { actor, id, organizationId } = goal;

    const body = await request.json() as { text?: string; checked?: boolean; planRow?: unknown };
    const planRow = await resolveSprintGoalPlanRow(organizationId, body.planRow);
    if ('error' in planRow) {
      return NextResponse.json({ error: planRow.error }, { status: 400 });
    }
    const patch: SprintGoalPatch = {
      ...(typeof body.text === 'string' ? { text: body.text.trim() } : {}),
      ...(typeof body.checked === 'boolean' ? { done: body.checked } : {}),
      ...(planRow.planRow !== undefined ? { planRow: planRow.planRow } : {}),
    };

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Provide text, checked and/or planRow' }, { status: 400 });
    }

    const row = await runAsBoardActor(actor, (tx) =>
      updateSprintGoal({ organizationId, goalId: id, patch }, tx)
    );

    if (!row) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    if (typeof body.text === 'string') {
      await syncSprintGoalsToTrackerFromRequest(request, { organizationId, sprintId: row.sprint_id });
    }

    return NextResponse.json({ success: true, item: toSprintGoalItem(row) });
  } catch (error) {
    console.error('Error updating sprint goal:', error);
    return NextResponse.json(
      { error: 'Failed to update sprint goal' },
      { status: 500 }
    );
  }
}

/** DELETE: удалить цель */
export async function DELETE(
  request: NextRequest,
  context: GoalRouteParams
) {
  try {
    const goal = await goalRouteContext(request, context);
    if ('response' in goal) return goal.response;
    const { actor, id, organizationId } = goal;

    const deleted = await runAsBoardActor(actor, (tx) =>
      deleteSprintGoal({ organizationId, goalId: id }, tx)
    );

    if (!deleted) {
      return NextResponse.json({ success: true, notFound: true });
    }
    await syncSprintGoalsToTrackerFromRequest(request, { organizationId, sprintId: deleted.sprintId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sprint goal:', error);
    return NextResponse.json(
      { error: 'Failed to delete sprint goal' },
      { status: 500 }
    );
  }
}
