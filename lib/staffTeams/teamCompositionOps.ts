/**
 * Состав команд для агентов (MCP): чтение и правка — те же операции, что у админки команд
 * (`/api/admin/organizations/[organizationId]/teams/[teamId]/members`). Право на правку проверяет вызывающий:
 * только администратор организации.
 */

import { z } from 'zod';

import { AddTrackerTeamMemberError } from '@/lib/onPrem/addTrackerPersonErrors';
import { addTrackerPersonToTeamWithProductUser } from '@/lib/onPrem/addTrackerPersonToTeamWithProductUser';
import { getEffectiveRoles } from '@/lib/roles/effectiveCatalog';
import { listOrgRoles } from '@/lib/roles/orgRolesRepository';
import { listSystemRoles } from '@/lib/roles/systemRolesRepository';

import { addOrgStaffToTeam, listTeamMembersWithStaff, removeTeamMember, updateTeamMemberRole } from './teamMembersRepository';
import { findTeamById, listTeams } from './teamsRepository';

const teamId = z.string().uuid().describe('teams[].id from get_team_composition');
const staffId = z.string().uuid().describe('members[].staffId from get_team_composition');
const roleSlug = z.string().trim().min(1).max(128).nullable().describe('roles[].slug, or null to clear the role');

export const TeamCompositionOpsSchema = z
  .array(
    z.discriminatedUnion('op', [
      z.object({
        displayName: z.string().trim().min(1).max(512).optional().describe('For a tracker user: name to show'),
        email: z.string().trim().email().max(320).optional().describe('For a tracker user: email, if known'),
        op: z.literal('addMember'),
        roleSlug: roleSlug.optional(),
        staffId: staffId.optional().describe('A person already in the organization'),
        teamId,
        trackerUserId: z
          .string()
          .min(1)
          .max(256)
          .optional()
          .describe('A tracker user not yet in the organization (from search_tracker_users)'),
      }),
      z.object({ op: z.literal('setRole'), roleSlug, staffId, teamId }),
      z.object({ op: z.literal('removeMember'), staffId, teamId }),
    ])
  )
  .min(1)
  .max(50);

type TeamCompositionOp = z.infer<typeof TeamCompositionOpsSchema>[number];

async function loadRoleSlugs(organizationId: string): Promise<Array<{ slug: string; title: string }>> {
  const [systemRows, orgRows] = await Promise.all([listSystemRoles(), listOrgRoles(organizationId)]);
  return getEffectiveRoles(systemRows, orgRows).map(({ slug, title }) => ({ slug, title }));
}

/** Команды организации с людьми (по `staffId`) и каталог ролей, которые можно назначить. */
export async function loadTeamComposition(organizationId: string, onlyTeamId?: string) {
  const [teams, roles] = await Promise.all([listTeams(organizationId, { activeOnly: true }), loadRoleSlugs(organizationId)]);
  const selected = teams.filter((team) => !onlyTeamId || team.id === onlyTeamId);
  const withMembers = await Promise.all(
    selected.map(async (team) => ({
      boardId: Number.parseInt(String(team.tracker_board_id), 10),
      id: team.id,
      members: (await listTeamMembersWithStaff(organizationId, team.id)).map((member) => ({
        email: member.staff_email,
        name: member.staff_display_name,
        roleSlug: member.role_slug,
        staffId: member.staff_id,
        trackerUserId: member.staff_tracker_user_id,
      })),
      title: team.title,
    }))
  );
  return { roles, teams: withMembers };
}

/** Ошибка данных операции до записи: способ добавления, команда, роль. */
async function opError(
  organizationId: string,
  op: TeamCompositionOp,
  roleSlugs: ReadonlySet<string>
): Promise<string | null> {
  if (op.op === 'addMember' && Boolean(op.staffId) === Boolean(op.trackerUserId)) {
    return 'addMember needs exactly one of staffId or trackerUserId';
  }
  if ('roleSlug' in op && op.roleSlug && !roleSlugs.has(op.roleSlug)) return `unknown role ${op.roleSlug}`;
  return (await findTeamById(organizationId, op.teamId)) ? null : `unknown team ${op.teamId}`;
}

/** Одна операция; null — ничего не изменилось (человек уже в команде или его там нет). */
async function applyOne(organizationId: string, op: TeamCompositionOp): Promise<string | null> {
  if (op.op === 'removeMember') {
    return (await removeTeamMember(organizationId, op.teamId, op.staffId)) ? op.staffId : null;
  }
  if (op.op === 'setRole') {
    return (await updateTeamMemberRole(organizationId, op.teamId, op.staffId, op.roleSlug))?.staff_id ?? null;
  }
  if (op.staffId) {
    return (await addOrgStaffToTeam(organizationId, op.teamId, op.staffId, op.roleSlug ?? null))?.staff_id ?? null;
  }
  const { member } = await addTrackerPersonToTeamWithProductUser({
    displayName: op.displayName,
    emailStr: op.email ?? '',
    organizationId,
    roleSlug: op.roleSlug ?? null,
    teamId: op.teamId,
    trackerUserId: op.trackerUserId ?? '',
  });
  return member.staff_id;
}

const NOTHING_CHANGED: Record<TeamCompositionOp['op'], string> = {
  addMember: 'the person is already in this team',
  removeMember: 'the person is not in this team',
  setRole: 'the person is not in this team',
};

/**
 * Применяет операции по очереди и останавливается на первой ошибке: сделанные до неё остаются
 * (как в админке, каждая правка — отдельная запись) и перечислены в `applied`.
 */
export async function applyTeamCompositionOps(input: {
  ops: readonly TeamCompositionOp[];
  organizationId: string;
}): Promise<
  { applied: Array<{ op: TeamCompositionOp['op']; staffId: string; teamId: string }>; error: string; ok: false; opIndex: number } | { applied: Array<{ op: TeamCompositionOp['op']; staffId: string; teamId: string }>; ok: true }
> {
  const roleSlugs = new Set((await loadRoleSlugs(input.organizationId)).map((role) => role.slug));
  const applied: Array<{ op: TeamCompositionOp['op']; staffId: string; teamId: string }> = [];
  for (const [opIndex, op] of input.ops.entries()) {
    const invalid = await opError(input.organizationId, op, roleSlugs);
    if (invalid) return { applied, error: `${op.op}: ${invalid}`, ok: false, opIndex };
    let changedStaffId: string | null;
    try {
      changedStaffId = await applyOne(input.organizationId, op);
    } catch (error) {
      if (!(error instanceof AddTrackerTeamMemberError)) throw error;
      return { applied, error: `${op.op}: ${error.message}`, ok: false, opIndex };
    }
    if (!changedStaffId) return { applied, error: `${op.op}: ${NOTHING_CHANGED[op.op]}`, ok: false, opIndex };
    applied.push({ op: op.op, staffId: changedStaffId, teamId: op.teamId });
  }
  return { applied, ok: true };
}
