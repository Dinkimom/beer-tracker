import type { OrgMemberRole } from '@/lib/organizations/types';
import type { TeamMemberRow } from '@/lib/staffTeams';

import { AddTrackerTeamMemberError } from './addTrackerPersonErrors';
import {
  addStaffToTeamIfRequested,
  assertTrackerTeamExists,
  ensureTrackerStaffRow,
  provisionTrackerJoinWithRollback,
} from './addTrackerPersonToTeamHelpers';

/**
 * Добавляет сотрудника из трекера в организацию (роль в organization_members) и при необходимости в команду
 * с ролью каталога; выдаёт учётку продукта без приглашений.
 */
export async function addTrackerPersonToOrganizationWithProductUser(input: {
  displayName?: string | null;
  emailStr: string;
  organizationId: string;
  orgRole: Extract<OrgMemberRole, 'member' | 'team_lead'>;
  roleSlug?: string | null;
  teamId?: string | null;
  trackerUserId: string;
}): Promise<{ member: TeamMemberRow | null }> {
  const emailNorm = input.emailStr.trim().toLowerCase();
  const teamIdNorm =
    input.teamId != null && String(input.teamId).trim() !== '' ? String(input.teamId).trim() : null;

  await assertTrackerTeamExists(input.organizationId, teamIdNorm);

  const staffRow = await ensureTrackerStaffRow({
    displayName: input.displayName,
    emailStr: input.emailStr,
    organizationId: input.organizationId,
    trackerUserId: input.trackerUserId,
  });
  const member = await addStaffToTeamIfRequested({
    organizationId: input.organizationId,
    roleSlug: input.roleSlug,
    staffId: staffRow.id,
    teamId: teamIdNorm,
  });

  await provisionTrackerJoinWithRollback({
    emailNorm,
    member,
    orgRole: input.orgRole,
    organizationId: input.organizationId,
    staffId: staffRow.id,
    teamId: teamIdNorm,
  });

  return { member };
}

/**
 * Добавляет сотрудника по трекеру в команду и сразу выдаёт учётку продукта (member + user_team_memberships), без приглашений.
 */
export async function addTrackerPersonToTeamWithProductUser(input: {
  displayName?: string | null;
  emailStr: string;
  organizationId: string;
  roleSlug?: string | null;
  teamId: string;
  trackerUserId: string;
}): Promise<{ member: TeamMemberRow }> {
  const { member } = await addTrackerPersonToOrganizationWithProductUser({
    displayName: input.displayName,
    emailStr: input.emailStr,
    organizationId: input.organizationId,
    orgRole: 'member',
    roleSlug: input.roleSlug,
    teamId: input.teamId,
    trackerUserId: input.trackerUserId,
  });
  if (!member) {
    throw new AddTrackerTeamMemberError(
      'Не удалось добавить: команда или сотрудник не найдены',
      404
    );
  }
  return { member };
}

export { AddTrackerTeamMemberError } from './addTrackerPersonErrors';
