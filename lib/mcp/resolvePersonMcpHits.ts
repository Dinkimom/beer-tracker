import type { SprintContextTeamMember } from '@/lib/sprints/sprintContextTypes';

import {
  loadOrgTeamMemberRoleIndex,
  lookupTeamMemberRole,
} from '@/lib/sprints/sprintContextTeamMembers';
import { searchStaffInOrg } from '@/lib/staffTeams';

interface ResolvePersonMcpHit {
  assigneeId: string;
  displayName: string;
  email: string | null;
  platforms?: SprintContextTeamMember['platforms'];
  role?: SprintContextTeamMember['role'];
  roleTitle?: string | null;
  staffUid: string | null;
  /** Id пользователя трекера; null — карточка сотрудника не привязана к трекеру. */
  trackerId: string | null;
  /** false: в трекере (Jira) у человека другой id, задачи там не сопоставятся с его строкой на доске. */
  trackerLinked: boolean;
}

function assigneeIdForHit(
  hit: { staffUid?: string; trackerId: string },
  role: SprintContextTeamMember | undefined
): string {
  if (role?.assigneeId) {
    return role.assigneeId;
  }
  const staffAssigneeId = hit.staffUid ? `staff:${hit.staffUid}` : null;
  if (hit.trackerId && hit.trackerId !== hit.staffUid) {
    return hit.trackerId;
  }
  return staffAssigneeId ?? hit.trackerId;
}

function mapResolvePersonHit(
  hit: {
    displayName: string;
    email?: string | null;
    staffUid?: string;
    trackerId: string;
  },
  roleIndex: Map<string, SprintContextTeamMember>
): ResolvePersonMcpHit {
  const staffAssigneeId = hit.staffUid ? `staff:${hit.staffUid}` : null;
  const role = lookupTeamMemberRole(roleIndex, [
    hit.trackerId,
    staffAssigneeId,
    hit.staffUid,
  ]);
  // searchStaffInOrg без привязки подставляет в trackerId staff uuid — агенту это выдавать нельзя.
  const trackerLinked = Boolean(hit.trackerId) && hit.trackerId !== hit.staffUid;
  return {
    assigneeId: assigneeIdForHit(hit, role),
    displayName: hit.displayName,
    email: hit.email ?? null,
    ...(role?.platforms ? { platforms: role.platforms } : {}),
    ...(role ? { role: role.role } : {}),
    ...(role?.roleTitle ? { roleTitle: role.roleTitle } : {}),
    staffUid: hit.staffUid ?? null,
    trackerId: trackerLinked ? hit.trackerId : null,
    trackerLinked,
  };
}

export async function resolvePersonMcpHits(
  organizationId: string,
  queryText: string
): Promise<ResolvePersonMcpHit[]> {
  const [hits, roleIndex] = await Promise.all([
    searchStaffInOrg(organizationId, queryText),
    loadOrgTeamMemberRoleIndex(organizationId),
  ]);
  return hits.map((hit) => mapResolvePersonHit(hit, roleIndex));
}
