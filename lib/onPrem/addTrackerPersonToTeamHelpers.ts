import type { OrgMemberRole } from '@/lib/organizations/types';
import type { TeamMemberRow } from '@/lib/staffTeams';
import type { StaffRow } from '@/lib/staffTeams/types';

import {
  addOrgStaffToTeam,
  findStaffByOrganizationAndEmailNorm,
  findStaffByOrganizationAndTrackerUserId,
  findTeamById,
  insertStaff,
  removeTeamMember,
} from '@/lib/staffTeams';
import { normalizedEmailLocalPart } from '@/lib/staffTeams/staffDisplayNameEmailLocalPart';

import { AddTrackerTeamMemberError } from './addTrackerPersonErrors';
import { provisionProductUserForTrackerJoin } from './provisionProductUserForTrackerJoin';

export async function assertTrackerTeamExists(
  organizationId: string,
  teamId: string | null
): Promise<void> {
  if (!teamId) {
    return;
  }
  const team = await findTeamById(organizationId, teamId);
  if (!team) {
    throw new AddTrackerTeamMemberError('Команда не найдена', 404);
  }
}

export async function ensureTrackerStaffRow(input: {
  displayName?: string | null;
  emailStr: string;
  organizationId: string;
  trackerUserId: string;
}): Promise<StaffRow> {
  const tid = input.trackerUserId.trim();
  const emailNorm = input.emailStr.trim().toLowerCase();
  const byTracker = await findStaffByOrganizationAndTrackerUserId(input.organizationId, tid);
  if (byTracker) {
    return byTracker;
  }
  if (emailNorm) {
    const byEmail = await findStaffByOrganizationAndEmailNorm(input.organizationId, emailNorm);
    if (byEmail) {
      return byEmail;
    }
  }
  const displayName =
    input.displayName?.trim() ||
    (emailNorm ? normalizedEmailLocalPart(emailNorm) : '') ||
    tid;
  return insertStaff(input.organizationId, {
    display_name: displayName,
    email: emailNorm || null,
    tracker_user_id: tid || null,
  });
}

export async function addStaffToTeamIfRequested(input: {
  organizationId: string;
  roleSlug?: string | null;
  staffId: string;
  teamId: string | null;
}): Promise<TeamMemberRow | null> {
  if (!input.teamId) {
    return null;
  }

  const added = await addOrgStaffToTeam(
    input.organizationId,
    input.teamId,
    input.staffId,
    input.roleSlug
  );
  if (!added) {
    throw new AddTrackerTeamMemberError('Сотрудник уже состоит в этой команде', 409);
  }
  return added;
}

async function rollbackTeamMemberOnProvisionFailure(input: {
  member: TeamMemberRow | null;
  organizationId: string;
  staffId: string;
  teamId: string | null;
}): Promise<void> {
  if (input.member && input.teamId) {
    await removeTeamMember(input.organizationId, input.teamId, input.staffId);
  }
}

export async function provisionTrackerJoinWithRollback(input: {
  emailNorm: string;
  member: TeamMemberRow | null;
  orgRole: Extract<OrgMemberRole, 'member' | 'team_lead'>;
  organizationId: string;
  staffId: string;
  teamId: string | null;
}): Promise<void> {
  try {
    await provisionProductUserForTrackerJoin({
      emailNorm: input.emailNorm,
      organizationId: input.organizationId,
      orgRole: input.orgRole,
    });
  } catch (error) {
    await rollbackTeamMemberOnProvisionFailure(input);
    const msg = error instanceof Error ? error.message : 'Не удалось выдать доступ к планеру';
    throw new AddTrackerTeamMemberError(msg, 409);
  }
}
