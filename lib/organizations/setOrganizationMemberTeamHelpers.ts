import type { ProductTeamRole } from '@/lib/organizations/userTeamMembershipRepository';
import type { StaffRow } from '@/lib/staffTeams/types';

import { catalogRoleSlugForPlannerTeamRole } from '@/lib/organizations/invitedTeamRoleFromCatalogSlug';
import {
  addTeamMember,
  findTeamById,
  insertStaff,
  listTeamIdsForStaffInOrganization,
  removeTeamMember,
} from '@/lib/staffTeams';

type SetOrganizationMemberTeamResult =
  { error: string; status: number } | { ok: true };

export function isMemberAlreadyOnTargetTeam(
  targetTeamId: string | null,
  existingMemberships: Array<{ team_id: string }>
): boolean {
  return (
    targetTeamId != null &&
    existingMemberships.length === 1 &&
    existingMemberships[0]!.team_id === targetTeamId
  );
}

export function resolvePlannerTeamRoleForAssign(
  input: {
    preservePlannerTeamRole?: boolean;
    teamRoleOnAssign?: ProductTeamRole;
  },
  existingMemberships: Array<{ is_team_lead: boolean }>
): ProductTeamRole {
  if (input.preservePlannerTeamRole && existingMemberships.length > 0) {
    return existingMemberships[0]!.is_team_lead ? 'team_lead' : 'team_member';
  }
  return input.teamRoleOnAssign ?? 'team_member';
}

export async function removeStaffFromAllOrganizationTeams(
  orgId: string,
  staffRow: StaffRow
): Promise<void> {
  const teamIds = await listTeamIdsForStaffInOrganization(orgId, staffRow.id);
  for (const teamId of teamIds) {
    await removeTeamMember(orgId, teamId, staffRow.id);
  }
}

export async function assignStaffToOrganizationTeam(input: {
  displayName: string;
  emailNorm: string;
  orgId: string;
  roleForAssign: ProductTeamRole;
  staffRow: StaffRow | null;
  targetTeamId: string;
}): Promise<SetOrganizationMemberTeamResult> {
  const team = await findTeamById(input.orgId, input.targetTeamId);
  if (!team) {
    return { error: 'Команда не найдена', status: 404 };
  }

  const staffRow =
    input.staffRow ??
    (await insertStaff(input.orgId, {
      display_name: input.displayName,
      email: input.emailNorm,
      tracker_user_id: null,
    }));

  const roleSlug = catalogRoleSlugForPlannerTeamRole(input.roleForAssign);
  const member = await addTeamMember(input.orgId, input.targetTeamId, staffRow.id, roleSlug);
  if (!member) {
    return { error: 'Не удалось добавить: команда или сотрудник не найдены', status: 404 };
  }

  return { ok: true };
}
