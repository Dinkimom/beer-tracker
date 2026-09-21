import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { getTeamByBoardId, searchRegistryEmployeesForTeam } from '@/lib/staffTeams';
import { BoardIdQuerySchema, formatValidationError, validateRequest } from '@/lib/validation';

/**
 * GET /api/teams/members/registry-search?boardId={boardId}&q={query}
 * Поиск сотрудников реестра (staff), ещё не состоящих в команде доски.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId } = tenantResult.ctx;

    const searchParams = request.nextUrl.searchParams;
    const validation = validateRequest(BoardIdQuerySchema, {
      boardId: searchParams.get('boardId'),
    });
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const boardId = parseInt(validation.data.boardId, 10);
    if (Number.isNaN(boardId)) {
      return NextResponse.json({ error: 'boardId must be a valid number' }, { status: 400 });
    }

    const q = (searchParams.get('q') ?? '').trim();
    if (q.length < 2) {
      return NextResponse.json({ items: [] });
    }

    const team = await getTeamByBoardId(organizationId, boardId);
    if (!team) {
      return NextResponse.json({ error: 'Team for board not found' }, { status: 404 });
    }

    const pattern = `%${q.replace(/%/g, '\\%')}%`;
    const rows = await searchRegistryEmployeesForTeam({
      pattern,
      teamId: team.id,
    });

    return NextResponse.json({
      items: rows.map((row) => {
        const staffUid = row.staff_uid.trim();
        return {
          avatarUrl: row.avatar_link,
          displayName: row.full_name?.trim() || row.name?.trim() || staffUid,
          email: row.email?.trim() || null,
          staffUid,
          trackerId: row.tracker_id?.trim() || staffUid,
        };
      }),
    });
  } catch (error) {
    return handleApiError(error, 'search registry for board team');
  }
}
