import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { listPlannerBoardsForAccessProfile } from '@/lib/staffTeams/plannerBoards';

/**
 * GET /api/boards
 * Доски планера — активные команды организации в PostgreSQL, видимые профилю.
 * Без Yandex Tracker `_paginate`: пересечение с Tracker на каждый заход держало TTFB ~10 с.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { ctx, profile } = tenantResult;
    const boards = await listPlannerBoardsForAccessProfile(ctx.organizationId, profile);
    return NextResponse.json(boards);
  } catch (error) {
    return handleApiError(error, 'fetch boards (PostgreSQL teams)');
  }
}
