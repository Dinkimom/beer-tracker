import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { insertSprintGoal, listSprintGoals } from '@/lib/sprintGoals';

/** GET: список целей по sprintId, goalType */
export async function GET(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;
    const { searchParams } = new URL(request.url);
    const sprintIdStr = searchParams.get('sprintId');
    const goalType = searchParams.get('goalType'); // 'delivery' | 'discovery'

    const sprintId = sprintIdStr ? parseInt(sprintIdStr, 10) : NaN;

    if (isNaN(sprintId) || !goalType || !['delivery', 'discovery'].includes(goalType)) {
      return NextResponse.json(
        { error: 'sprintId and goalType (delivery|discovery) are required' },
        { status: 400 }
      );
    }

    const rows = await listSprintGoals({
      organizationId,
      sprintId,
      goalType,
    });

    const checklistItems = rows.map((row) => ({
      id: String(row.id),
      text: row.text ?? '',
      checked: Boolean(row.done),
      checklistItemType: 'standard' as const,
    }));

    const checklistDone = checklistItems.filter((i) => i.checked).length;
    const checklistTotal = checklistItems.length;

    return NextResponse.json({
      checklistItems,
      checklistDone,
      checklistTotal,
    });
  } catch (error) {
    console.error('Error fetching sprint goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sprint goals' },
      { status: 500 }
    );
  }
}

/** POST: создать цель */
export async function POST(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;
    const body = await request.json();
    const { sprintId, goalType, text, team } = body as {
      sprintId: number;
      goalType: 'delivery' | 'discovery';
      text: string;
      team?: string;
    };

    if (
      typeof sprintId !== 'number' ||
      !goalType ||
      !['delivery', 'discovery'].includes(goalType) ||
      typeof text !== 'string' ||
      !text.trim()
    ) {
      return NextResponse.json(
        { error: 'sprintId, goalType and text are required' },
        { status: 400 }
      );
    }

    const row = await insertSprintGoal({
      organizationId,
      sprintId,
      goalType,
      team,
      text: text.trim(),
    });

    const item = {
      id: String(row.id),
      text: row.text ?? '',
      checked: Boolean(row.done),
      checklistItemType: 'standard' as const,
    };

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('Error creating sprint goal:', error);
    return NextResponse.json(
      { error: 'Failed to create sprint goal' },
      { status: 500 }
    );
  }
}
