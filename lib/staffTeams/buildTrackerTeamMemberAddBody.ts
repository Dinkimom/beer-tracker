/**
 * Общее тело POST для добавления участника по Tracker id + email
 * (админка on-prem и состав команды в планере).
 * В compatibility-контракте предпочтителен staffUid → overseer.staff_teams.
 */
interface TrackerTeamMemberAddBody {
  display_name?: string;
  email: string;
  role_slug: string | null;
  tracker_user_id: string;
}

/** Тело POST /teams/members: либо registry staffUid, либо tracker+email. */
export type TeamMemberAddRequestBody =
  | TrackerTeamMemberAddBody
  | { staffUid: string };

export function buildTrackerTeamMemberAddBody(input: {
  displayName?: string | null;
  email?: string | null;
  roleSlug?: string | null;
  trackerUserId: string;
}): TrackerTeamMemberAddBody | null {
  const trackerUserId = input.trackerUserId.trim();
  const email = input.email?.trim();
  if (!trackerUserId || !email) {
    return null;
  }
  const displayName = input.displayName?.trim();
  return {
    tracker_user_id: trackerUserId,
    email,
    ...(displayName ? { display_name: displayName } : {}),
    role_slug: input.roleSlug?.trim() || null,
  };
}

/** Предпочитает staffUid (overseer); иначе tracker_user_id + email. */
export function buildTeamMemberAddRequestBody(input: {
  displayName?: string | null;
  email?: string | null;
  roleSlug?: string | null;
  staffUid?: string | null;
  trackerUserId: string;
}): TeamMemberAddRequestBody | null {
  const staffUid = input.staffUid?.trim();
  if (staffUid) {
    return { staffUid };
  }
  return buildTrackerTeamMemberAddBody(input);
}
