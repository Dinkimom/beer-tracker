import { NextResponse } from 'next/server';

import { findUserById } from '@/lib/auth';
import {
  AddTrackerTeamMemberError,
  addTrackerPersonToTeamWithProductUser,
} from '@/lib/onPrem/addTrackerPersonToTeamWithProductUser';
import { invitedTeamRoleFromCatalogRoleSlug } from '@/lib/organizations/invitedTeamRoleFromCatalogSlug';
import { findOrganizationMembership } from '@/lib/organizations/organizationMembersRepository';
import {
  addOrgStaffToTeam,
  findStaffByOrganizationAndEmailNorm,
  insertStaff,
} from '@/lib/staffTeams';

function displayNameFromUserEmail(email: string): string {
  const e = email.trim().toLowerCase();
  const at = e.indexOf('@');
  if (at > 0) {
    return e.slice(0, at);
  }
  return e.length > 0 ? e : 'Пользователь';
}

export async function addMemberByUserId(input: {
  bodyUserId: string;
  orgId: string;
  roleSlug: string | null | undefined;
  teamId: string;
}) {
  const om = await findOrganizationMembership(input.orgId, input.bodyUserId);
  if (!om) {
    return NextResponse.json({ error: 'Пользователь не состоит в организации' }, { status: 404 });
  }

  const userRow = await findUserById(input.bodyUserId);
  if (!userRow) {
    return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
  }

  const emailNorm = String(userRow.email).trim().toLowerCase();
  let staffRow = await findStaffByOrganizationAndEmailNorm(input.orgId, emailNorm);
  if (!staffRow) {
    staffRow = await insertStaff(input.orgId, {
      display_name: displayNameFromUserEmail(emailNorm),
      email: emailNorm,
      tracker_user_id: null,
    });
  }

  const member = await addOrgStaffToTeam(
    input.orgId,
    input.teamId,
    staffRow.id,
    input.roleSlug ?? null
  );
  if (!member) {
    return NextResponse.json({ error: 'Сотрудник уже состоит в этой команде' }, { status: 409 });
  }

  return NextResponse.json({ member }, { status: 201 });
}

export async function addMemberByStaffUid(input: {
  orgId: string;
  roleSlug: string | null | undefined;
  staffUid: string;
  teamId: string;
}) {
  const member = await addOrgStaffToTeam(
    input.orgId,
    input.teamId,
    input.staffUid,
    input.roleSlug ?? null
  );
  if (!member) {
    return NextResponse.json({ error: 'Сотрудник уже состоит в этой команде' }, { status: 409 });
  }
  return NextResponse.json({ member }, { status: 201 });
}

export async function addMemberByTrackerUser(input: {
  displayName: string | undefined;
  email: string;
  orgId: string;
  roleSlug: string | null | undefined;
  teamId: string;
  trackerUserId: string;
}) {
  try {
    const { member } = await addTrackerPersonToTeamWithProductUser({
      displayName: input.displayName,
      emailStr: input.email,
      organizationId: input.orgId,
      roleSlug: input.roleSlug ?? null,
      teamId: input.teamId,
      trackerUserId: input.trackerUserId,
    });
    return NextResponse.json({ member }, { status: 201 });
  } catch (e) {
    if (e instanceof AddTrackerTeamMemberError) {
      return NextResponse.json({ error: e.message }, { status: e.httpStatus });
    }
    throw e;
  }
}

export function validateTeamLeadAssignment(
  isOrgAdmin: boolean,
  roleSlug: string | null | undefined
): NextResponse | null {
  const invitedTeamRole = invitedTeamRoleFromCatalogRoleSlug(roleSlug ?? null);
  if (!isOrgAdmin && invitedTeamRole === 'team_lead') {
    return NextResponse.json(
      { error: 'Только администратор организации может назначать роль тимлида' },
      { status: 403 }
    );
  }
  return null;
}
