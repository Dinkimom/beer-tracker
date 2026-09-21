import type { AccessProfile } from '@/lib/access/orgAccess';
import type { TeamRow } from '@/lib/staffTeams/types';

import { NextResponse } from 'next/server';
import { DatabaseError } from 'pg';
import { z } from 'zod';

import {
  requireTeamManagementAccess,
  requireTenantWithAdminProfile,
} from '@/lib/api-tenant';
import { findTeamBlockingBoard, updateTeam } from '@/lib/staffTeams';

const UuidSchema = z.string().uuid();

const BoardIdSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^\d+$/).transform((s) => Number.parseInt(s, 10)),
]);

const PatchBodySchema = z
  .object({
    active: z.boolean().optional(),
    slug: z.string().trim().min(1).max(128).optional(),
    title: z.string().trim().min(1).max(256).optional(),
    tracker_board_id: BoardIdSchema.optional(),
    tracker_queue_key: z.string().trim().min(1).max(256).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'empty' });

type TeamPatchBody = z.infer<typeof PatchBodySchema>;

function isPostgresUniqueViolation(err: unknown): boolean {
  return err instanceof DatabaseError && err.code === '23505';
}

export function parseTeamRouteTeamId(teamIdRaw: string): NextResponse | string {
  const teamIdParsed = UuidSchema.safeParse(teamIdRaw);
  if (!teamIdParsed.success) {
    return NextResponse.json({ error: 'Некорректный идентификатор команды' }, { status: 400 });
  }
  return teamIdParsed.data;
}

async function parseTeamPatchBody(
  request: Request
): Promise<NextResponse | TeamPatchBody> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
  }
  const parsed = PatchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Нет полей для обновления' }, { status: 400 });
  }
  return parsed.data;
}

export async function requireTeamPatchAccess(
  request: Request,
  organizationId: string,
  teamId: string
): Promise<
  NextResponse | {
    auth: Extract<Awaited<ReturnType<typeof requireTenantWithAdminProfile>>, { ctx: unknown }>;
    patch: TeamPatchBody;
  }
> {
  const auth = await requireTenantWithAdminProfile(request, organizationId);
  if ('response' in auth) {
    return auth.response;
  }
  const deniedTeam = requireTeamManagementAccess(auth.profile, teamId);
  if (deniedTeam) {
    return deniedTeam;
  }
  const patch = await parseTeamPatchBody(request);
  if (patch instanceof NextResponse) {
    return patch;
  }
  return { auth, patch };
}

export function denyTeamLeadSensitivePatch(
  profile: AccessProfile,
  patch: TeamPatchBody
): NextResponse | null {
  if (profile.orgRole === 'org_admin') {
    return null;
  }
  const sensitive =
    patch.tracker_board_id !== undefined ||
    patch.tracker_queue_key !== undefined ||
    patch.slug !== undefined;
  if (!sensitive) {
    return null;
  }
  return NextResponse.json(
    { error: 'Тимлид может менять только название и флаг активности команды' },
    { status: 403 }
  );
}

export function validateTeamPatchConflicts(args: {
  orgTeams: TeamRow[];
  patch: TeamPatchBody;
  teamId: string;
}): NextResponse | null {
  const { orgTeams, patch, teamId } = args;

  // Queues may be shared across teams; only board binding stays exclusive.

  if (patch.tracker_board_id !== undefined) {
    const blockB = findTeamBlockingBoard(orgTeams, patch.tracker_board_id, teamId);
    if (blockB) {
      return NextResponse.json(
        {
          error: `Доска ${String(patch.tracker_board_id)} уже привязана к команде «${blockB.title}»`,
        },
        { status: 409 }
      );
    }
  }

  if (patch.slug !== undefined) {
    const taken = orgTeams.some((t) => t.id !== teamId && t.slug === patch.slug);
    if (taken) {
      return NextResponse.json(
        { error: `Слуг «${patch.slug}» уже занят другой командой` },
        { status: 409 }
      );
    }
  }

  return null;
}

export async function executeTeamPatchUpdate(
  organizationId: string,
  teamId: string,
  patch: TeamPatchBody
): Promise<NextResponse> {
  try {
    const team = await updateTeam(organizationId, teamId, patch);
    if (!team) {
      return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 });
    }
    return NextResponse.json({ team });
  } catch (err) {
    if (isPostgresUniqueViolation(err)) {
      return NextResponse.json(
        {
          error: 'В организации уже есть команда с таким ID доски трекера (tracker_board_id)',
        },
        { status: 409 }
      );
    }
    throw err;
  }
}
