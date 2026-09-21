import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { deleteSprintGoal, updateSprintGoal } from '@/lib/sprintGoals';

/** PATCH: обновить цель (text и/или checked) */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;
    const { id } = await resolveParams(context.params);
    if (!id) {
      return NextResponse.json({ error: 'Goal id is required' }, { status: 400 });
    }

    const body = await request.json() as { text?: string; checked?: boolean };
    const updateFields: string[] = [];
    const updateValues: Array<boolean | number | string | null | undefined> = [];
    let paramIndex = 1;

    if (typeof body.text === 'string') {
      updateFields.push(`text = $${paramIndex++}`);
      updateValues.push(body.text.trim());
    }
    if (typeof body.checked === 'boolean') {
      updateFields.push(`done = $${paramIndex++}`);
      updateValues.push(body.checked);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'Provide text and/or checked' }, { status: 400 });
    }

    const row = await updateSprintGoal({
      organizationId,
      goalId: id,
      updateFields,
      updateValues,
    });

    if (!row) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      item: {
        id: String(row.id),
        text: row.text ?? '',
        checked: Boolean(row.done),
        checklistItemType: 'standard' as const,
      },
    });
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
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;
    const { id } = await resolveParams(context.params);
    if (!id) {
      return NextResponse.json({ error: 'Goal id is required' }, { status: 400 });
    }

    const deleted = await deleteSprintGoal({
      organizationId,
      goalId: id,
    });

    if (!deleted) {
      return NextResponse.json({ success: true, notFound: true });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sprint goal:', error);
    return NextResponse.json(
      { error: 'Failed to delete sprint goal' },
      { status: 500 }
    );
  }
}
