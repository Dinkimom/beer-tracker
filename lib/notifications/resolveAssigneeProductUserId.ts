import { getStaffByTrackerUserIdInOrg } from '@/lib/staffTeams/teamMembersQuery';
import { isTeamSwimlaneAssigneeId } from '@/lib/swimlane/teamSwimlaneAssignee';
import { STAFF_SWIMLANE_ASSIGNEE_PREFIX } from '@/lib/teamMemberUtils';

/**
 * Резолвит assignee_id планера (tracker uid или staff:uuid) в uuid сотрудника продукта.
 */
export async function resolveAssigneeProductUserId(
  organizationId: string,
  assigneeId: string
): Promise<string | null> {
  const trimmed = assigneeId.trim();
  if (!trimmed || isTeamSwimlaneAssigneeId(trimmed)) {
    return null;
  }

  if (trimmed.startsWith(STAFF_SWIMLANE_ASSIGNEE_PREFIX)) {
    const staffUid = trimmed.slice(STAFF_SWIMLANE_ASSIGNEE_PREFIX.length).trim();
    return staffUid || null;
  }

  const staff = await getStaffByTrackerUserIdInOrg(organizationId, trimmed);
  return staff?.staffUid ?? null;
}
