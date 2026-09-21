import { NextResponse } from 'next/server';
import { DatabaseError } from 'pg';

import { insertTeam, listTeams, allocateUniqueTeamSlug, findTeamBlockingBoard } from '@/lib/staffTeams';

import { resolveTeamCreateSlug } from './adminTeamsRouteHelpers';

type OrgTeam = Awaited<ReturnType<typeof listTeams>>[number];

/** Boards stay unique per org; queues may be shared across teams (sync dedupes by queue key). */
function assertNoTeamBoardConflict(
  orgTeams: Awaited<ReturnType<typeof listTeams>>,
  boardNum: number
): NextResponse | null {
  const blockB = findTeamBlockingBoard(orgTeams, boardNum);
  if (blockB) {
    return NextResponse.json(
      { error: `Доска ${String(boardNum)} уже привязана к команде «${blockB.title}»` },
      { status: 409 }
    );
  }
  return null;
}

async function insertAdminTeamOrConflict(
  orgId: string,
  payload: {
    active?: boolean;
    slug: string;
    title: string;
    tracker_board_id: number;
    tracker_queue_key: string;
  }
) {
  try {
    const team = await insertTeam(orgId, {
      active: payload.active,
      slug: payload.slug,
      title: payload.title,
      tracker_board_id: payload.tracker_board_id,
      tracker_queue_key: payload.tracker_queue_key,
    });
    return NextResponse.json({ team });
  } catch (err) {
    if (err instanceof DatabaseError && err.code === '23505') {
      return NextResponse.json(
        { error: 'В организации уже есть команда с таким ID доски трекера (tracker_board_id)' },
        { status: 409 }
      );
    }
    throw err;
  }
}

export async function createTeamFromAdminPost(input: {
  orgId: string;
  orgTeams: OrgTeam[];
  payload: {
    active?: boolean;
    slug?: string;
    title: string;
    tracker_board_id: number;
    tracker_queue_key: string;
  };
}) {
  const queueKey = input.payload.tracker_queue_key.trim();
  const boardNum = input.payload.tracker_board_id;
  const conflict = assertNoTeamBoardConflict(input.orgTeams, boardNum);
  if (conflict) {
    return conflict;
  }
  const slugResult = await resolveTeamCreateSlug({
    allocateUniqueTeamSlug,
    orgId: input.orgId,
    orgTeams: input.orgTeams,
    slugInput: input.payload.slug,
    title: input.payload.title,
  });
  if (slugResult instanceof NextResponse) {
    return slugResult;
  }
  return insertAdminTeamOrConflict(input.orgId, {
    active: input.payload.active,
    slug: slugResult.slug,
    title: input.payload.title,
    tracker_board_id: boardNum,
    tracker_queue_key: queueKey,
  });
}
