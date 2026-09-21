import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { requirePlannerTeamCompositionWriteAccess } from '@/lib/planner/requirePlannerTeamCompositionWriteAccess';
import { REGISTRY_UUID_STRING_RE } from '@/lib/registryUuidString';
import { roleCatalogEntriesToResolutionSlices } from '@/lib/roles/catalog';
import { getEffectiveRoles } from '@/lib/roles/effectiveCatalog';
import { listOrgRoles } from '@/lib/roles/orgRolesRepository';
import { listSystemRoles } from '@/lib/roles/systemRolesRepository';
import {
  enrichPlannerTeamMembersFromTracker,
  fetchTeamMembersByBoardIdForOrg,
  getTeamByBoardId,
  removeTeamMember,
} from '@/lib/staffTeams';
import {
  addStaffUidToTeam,
  addTrackerMemberToTeam,
  parseAddTeamMemberBoardId,
  resolveTeamForBoard,
} from '@/lib/staffTeams/teamMembersPostRouteHelpers';
import { convertTeamMembersToDevelopers } from '@/lib/teamMemberUtils';
import { BoardIdQuerySchema, formatValidationError, validateRequest } from '@/lib/validation';

const AddMemberBodySchema = z
  .object({
  display_name: z.string().trim().min(1).max(512).optional(),
  email: z.string().trim().email().max(320).optional(),
  role_slug: z.string().trim().min(1).max(128).optional().nullable(),
  staffUid: z
    .string()
    .trim()
    .regex(REGISTRY_UUID_STRING_RE, { message: 'Некорректный staffUid' })
    .optional(),
  tracker_user_id: z.string().trim().min(1).max(256).optional(),
  })
  .superRefine((data, ctx) => {
    const hasStaffUid = Boolean(data.staffUid);
    const hasTracker = Boolean(data.tracker_user_id);
    const hasEmail = Boolean(data.email);
    if (!hasStaffUid && !(hasTracker && hasEmail)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Передайте либо staffUid, либо tracker_user_id + email',
      });
    }
  });

/**
 * GET /api/teams/members?boardId={boardId}
 * Участники команды из PostgreSQL приложения (teams / staff / team_members) в разрезе tenant.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId } = tenantResult.ctx;

    const searchParams = request.nextUrl.searchParams;
    const boardId = searchParams.get('boardId');

    const validation = validateRequest(BoardIdQuerySchema, { boardId });
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const boardIdNum = parseInt(validation.data.boardId, 10);

    if (isNaN(boardIdNum)) {
      return NextResponse.json(
        { error: 'boardId must be a valid number' },
        { status: 400 }
      );
    }

    const [teamMembersRaw, systemRows, orgRows] = await Promise.all([
      fetchTeamMembersByBoardIdForOrg(organizationId, boardIdNum),
      listSystemRoles(),
      listOrgRoles(organizationId),
    ]);

    const teamMembers = await enrichPlannerTeamMembersFromTracker(
      organizationId,
      teamMembersRaw
    );

    const roleCtx = roleCatalogEntriesToResolutionSlices(
      getEffectiveRoles(systemRows, orgRows)
    );
    const developers = convertTeamMembersToDevelopers(teamMembers, roleCtx);

    return NextResponse.json({
      teamMembers,
      developers,
      count: teamMembers.length,
    });
  } catch (error) {
    return handleApiError(error, 'fetch team members');
  }
}

/**
 * DELETE /api/teams/members?boardId={boardId}&assigneeId={assigneeId}
 * Удаляет участника команды доски из состава team_members.
 * assigneeId соответствует Developer.id (tracker uid или staff:<staff_uuid>).
 */
export async function DELETE(request: NextRequest) {
  try {
    const access = await requirePlannerTeamCompositionWriteAccess(request);
    if ('response' in access) {
      return access.response;
    }
    const { organizationId } = access;

    const searchParams = request.nextUrl.searchParams;
    const boardId = searchParams.get('boardId');
    const assigneeId = (searchParams.get('assigneeId') ?? '').trim();

    const validation = validateRequest(BoardIdQuerySchema, { boardId });
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }
    if (!assigneeId) {
      return NextResponse.json(
        { error: 'assigneeId is required' },
        { status: 400 }
      );
    }

    const boardIdNum = parseInt(validation.data.boardId, 10);
    if (isNaN(boardIdNum)) {
      return NextResponse.json(
        { error: 'boardId must be a valid number' },
        { status: 400 }
      );
    }

    const team = await getTeamByBoardId(organizationId, boardIdNum);
    if (!team) {
      return NextResponse.json(
        { error: 'Team for board not found' },
        { status: 404 }
      );
    }

    const teamMembers = await fetchTeamMembersByBoardIdForOrg(organizationId, boardIdNum);
    const matchedMember = teamMembers.find((member) => {
      const trackerId = (member.tracker_uid ?? '').trim();
      if (trackerId && trackerId === assigneeId) {
        return true;
      }
      return `staff:${member.uid}` === assigneeId;
    });

    if (!matchedMember) {
      return NextResponse.json(
        { error: 'Member not found for provided assigneeId' },
        { status: 404 }
      );
    }

    const ok = await removeTeamMember(organizationId, team.id, matchedMember.uid);
    if (!ok) {
      return NextResponse.json({ error: 'Участник не найден' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, 'remove team member');
  }
}

/**
 * POST /api/teams/members
 * Body: { tracker_user_id?: string; email?: string; display_name?: string; role_slug?: string | null; staffUid?: string }
 * Query: ?boardId={boardId}
 * Добавляет участника в команду доски (с поддержкой staffUid и tracker_user_id).
 */
export async function POST(request: NextRequest) {
  try {
    const access = await requirePlannerTeamCompositionWriteAccess(request);
    if ('response' in access) {
      return access.response;
    }
    const { organizationId } = access;

    const boardIdParsed = parseAddTeamMemberBoardId(request);
    if (boardIdParsed instanceof NextResponse) {
      return boardIdParsed;
    }
    const boardId = boardIdParsed;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    }
    const parsed = AddMemberBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
        { status: 400 }
      );
    }

    const { display_name, email, role_slug, staffUid, tracker_user_id } = parsed.data;
    const teamParsed = await resolveTeamForBoard(organizationId, boardId);
    if (teamParsed instanceof NextResponse) {
      return teamParsed;
    }
    const team = teamParsed;

    if (staffUid) {
      const staffError = await addStaffUidToTeam(organizationId, team.id, staffUid);
      if (staffError) {
        return staffError;
      }
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    const trackerError = await addTrackerMemberToTeam({
      displayName: display_name,
      email,
      organizationId,
      roleSlug: role_slug,
      teamId: team.id,
      trackerUserId: tracker_user_id,
    });
    if (trackerError) {
      return trackerError;
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'add team member');
  }
}
