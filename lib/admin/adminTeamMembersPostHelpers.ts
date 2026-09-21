import { NextResponse } from 'next/server';

import { findTeamById } from '@/lib/staffTeams';

import {
  addMemberByStaffUid,
  addMemberByTrackerUser,
  addMemberByUserId,
  validateTeamLeadAssignment,
} from './adminTeamMembersRouteHelpers';
import { parseTeamRouteIds, requireTeamManagementForRoute } from './adminTeamRouteHelpers';

export async function addTeamMemberFromPostBody(
  auth: Awaited<ReturnType<typeof requireTeamManagementForRoute>>,
  teamId: string,
  body: {
    display_name?: string;
    email?: string;
    role_slug?: string | null;
    staff_uid?: string;
    tracker_user_id?: string;
    user_id?: string;
  }
) {
  if (auth instanceof NextResponse) return auth;

  const orgId = auth.ctx.organizationId;
  const {
    display_name,
    email,
    role_slug: roleSlug,
    staff_uid: staffUid,
    tracker_user_id: trackerUserId,
    user_id: bodyUserId,
  } = body;

  const team = await findTeamById(orgId, teamId);
  if (!team) {
    return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 });
  }

  const teamLeadDenied = validateTeamLeadAssignment(auth.profile.orgRole === 'org_admin', roleSlug);
  if (teamLeadDenied) return teamLeadDenied;

  if (bodyUserId) {
    return addMemberByUserId({ bodyUserId, orgId, roleSlug, teamId });
  }
  if (staffUid) {
    return addMemberByStaffUid({ orgId, roleSlug, staffUid, teamId });
  }
  return addMemberByTrackerUser({
    displayName: display_name,
    email: email!,
    orgId,
    roleSlug,
    teamId,
    trackerUserId: trackerUserId!,
  });
}

export { parseTeamRouteIds, requireTeamManagementForRoute };
