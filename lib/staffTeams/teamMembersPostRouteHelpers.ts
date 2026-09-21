import { NextRequest, NextResponse } from 'next/server';

import {
  AddTrackerTeamMemberError,
  addTrackerPersonToTeamWithProductUser,
} from '@/lib/onPrem/addTrackerPersonToTeamWithProductUser';
import { addOrgStaffToTeam, getTeamByBoardId } from '@/lib/staffTeams';
import { BoardIdQuerySchema, formatValidationError, validateRequest } from '@/lib/validation';

export function parseAddTeamMemberBoardId(
  request: NextRequest
): NextResponse | number {
  const validation = validateRequest(BoardIdQuerySchema, {
    boardId: request.nextUrl.searchParams.get('boardId'),
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
  return boardId;
}

export async function addStaffUidToTeam(
  organizationId: string,
  teamId: string,
  staffUid: string
): Promise<NextResponse | null> {
  const added = await addOrgStaffToTeam(organizationId, teamId, staffUid);
  if (!added) {
    return NextResponse.json(
      { error: 'Сотрудник уже состоит в этой команде' },
      { status: 409 }
    );
  }
  return null;
}

export async function addTrackerMemberToTeam(args: {
  displayName?: string;
  email?: string;
  organizationId: string;
  roleSlug?: string | null;
  teamId: string;
  trackerUserId?: string;
}): Promise<NextResponse | null> {
  try {
    await addTrackerPersonToTeamWithProductUser({
      displayName: args.displayName,
      emailStr: args.email ?? '',
      organizationId: args.organizationId,
      roleSlug: args.roleSlug ?? null,
      teamId: args.teamId,
      trackerUserId: args.trackerUserId ?? '',
    });
    return null;
  } catch (error) {
    if (error instanceof AddTrackerTeamMemberError) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus });
    }
    throw error;
  }
}

export async function resolveTeamForBoard(
  organizationId: string,
  boardId: number
): Promise<NextResponse | { id: string }> {
  const team = await getTeamByBoardId(organizationId, boardId);
  if (!team) {
    return NextResponse.json({ error: 'Team for board not found' }, { status: 404 });
  }
  return team;
}
