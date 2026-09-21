import { findUserById } from '@/lib/auth/userRepository';
import { findOrganizationMembership } from '@/lib/organizations/organizationMembersRepository';
import {
  listUserTeamMembershipsInOrganization,
  type ProductTeamRole,
} from '@/lib/organizations/userTeamMembershipRepository';
import { findStaffByOrganizationAndEmailNorm } from '@/lib/staffTeams';

import {
  assignStaffToOrganizationTeam,
  isMemberAlreadyOnTargetTeam,
  removeStaffFromAllOrganizationTeams,
  resolvePlannerTeamRoleForAssign,
} from './setOrganizationMemberTeamHelpers';

function displayNameFromUserEmail(email: string): string {
  const e = email.trim().toLowerCase();
  const at = e.indexOf('@');
  if (at > 0) {
    return e.slice(0, at);
  }
  return e.length > 0 ? e : 'Пользователь';
}

type SetOrganizationMemberTeamResult =
  { error: string; status: number } | { ok: true };

async function applyOrganizationMemberTeamChange(input: {
  emailNorm: string;
  existingAtStart: Awaited<ReturnType<typeof listUserTeamMembershipsInOrganization>>;
  orgId: string;
  roleForAssign: ProductTeamRole;
  staffRow: Awaited<ReturnType<typeof findStaffByOrganizationAndEmailNorm>>;
  targetTeamId: string | null;
}): Promise<SetOrganizationMemberTeamResult> {
  if (input.staffRow) {
    await removeStaffFromAllOrganizationTeams(input.orgId, input.staffRow);
  }
  if (input.targetTeamId == null) {
    return { ok: true };
  }
  return assignStaffToOrganizationTeam({
    displayName: displayNameFromUserEmail(input.emailNorm),
    emailNorm: input.emailNorm,
    orgId: input.orgId,
    roleForAssign: input.roleForAssign,
    staffRow: input.staffRow,
    targetTeamId: input.targetTeamId,
  });
}

/**
 * Снимает пользователя со всех команд организации (staff + team_members)
 * и при необходимости добавляет в указанную команду с ролью планера.
 */
export async function setOrganizationMemberTeam(input: {
  organizationId: string;
  userId: string;
  teamId: string | null;
  teamRoleOnAssign?: ProductTeamRole;
  preservePlannerTeamRole?: boolean;
}): Promise<SetOrganizationMemberTeamResult> {
  const { organizationId: orgId, userId, teamId: targetTeamId } = input;

  const membership = await findOrganizationMembership(orgId, userId);
  if (!membership) {
    return { error: 'Пользователь не состоит в организации', status: 404 };
  }

  const userRow = await findUserById(userId);
  if (!userRow) {
    return { error: 'Пользователь не найден', status: 404 };
  }

  const existingAtStart = await listUserTeamMembershipsInOrganization(orgId, userId);
  if (isMemberAlreadyOnTargetTeam(targetTeamId, existingAtStart)) {
    return { ok: true };
  }
  if (targetTeamId == null && existingAtStart.length === 0) {
    return { ok: true };
  }

  const emailNorm = String(userRow.email).trim().toLowerCase();
  return applyOrganizationMemberTeamChange({
    emailNorm,
    existingAtStart,
    orgId,
    roleForAssign: resolvePlannerTeamRoleForAssign(input, existingAtStart),
    staffRow: await findStaffByOrganizationAndEmailNorm(orgId, emailNorm),
    targetTeamId,
  });
}
