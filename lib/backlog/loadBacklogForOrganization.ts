import { roleCatalogEntriesToResolutionSlices } from '@/lib/roles/catalog';
import { getEffectiveRoles } from '@/lib/roles/effectiveCatalog';
import { listOrgRoles } from '@/lib/roles/orgRolesRepository';
import { listSystemRoles } from '@/lib/roles/systemRolesRepository';
import { queryBacklogIssueSnapshots } from '@/lib/snapshots';
import {
  enrichPlannerTeamMembersFromTracker,
  fetchTeamMembersByBoardIdForOrg,
  getTeamByBoardId,
} from '@/lib/staffTeams';
import { mergeTeamMembersWithAssignees } from '@/lib/teamMemberUtils';
import { extractDevelopers, mapTrackerIssueToTask } from '@/lib/trackerApi';
import { loadTrackerIntegrationForOrganization } from '@/lib/trackerIntegration';

interface BacklogPayloadForOrganization {
  developers: unknown;
  pagination: {
    page: number;
    perPage: number;
    totalCount: number;
    totalPages: number;
  };
  tasks: unknown[];
}

async function mergeDevelopersWithOrgTeam(
  organizationId: string,
  boardIdNum: number,
  backlogAssignees: ReturnType<typeof extractDevelopers>
): Promise<BacklogPayloadForOrganization['developers']> {
  let developers: BacklogPayloadForOrganization['developers'] = backlogAssignees;
  try {
    const [teamMembersRaw, systemRows, orgRows] = await Promise.all([
      fetchTeamMembersByBoardIdForOrg(organizationId, boardIdNum),
      listSystemRoles(),
      listOrgRoles(organizationId),
    ]);
    const teamMembers = await enrichPlannerTeamMembersFromTracker(organizationId, teamMembersRaw);
    const roleCtx = roleCatalogEntriesToResolutionSlices(getEffectiveRoles(systemRows, orgRows));
    developers = mergeTeamMembersWithAssignees(teamMembers, backlogAssignees, roleCtx);
  } catch (err) {
    console.warn('Failed to fetch team members from PostgreSQL:', err);
  }
  return developers;
}

export async function loadBacklogForOrganization(
  organizationId: string,
  boardIdNum: number,
  pageNum: number,
  perPageNum: number
): Promise<BacklogPayloadForOrganization> {
  const team = await getTeamByBoardId(organizationId, boardIdNum);
  const queueKey = team?.tracker_queue_key?.trim();
  if (!queueKey) {
    return {
      tasks: [],
      developers: await mergeDevelopersWithOrgTeam(organizationId, boardIdNum, []),
      pagination: {
        page: pageNum,
        perPage: perPageNum,
        totalPages: 0,
        totalCount: 0,
      },
    };
  }

  const [{ rows, totalPages, totalCount }, integration] = await Promise.all([
    queryBacklogIssueSnapshots(organizationId, {
      page: pageNum,
      perPage: perPageNum,
      trackerQueueKey: queueKey,
    }),
    loadTrackerIntegrationForOrganization(organizationId),
  ]);
  const issues = rows.map((r) => r.payload);
  const tasks = issues.map((issue) => mapTrackerIssueToTask(issue, integration));
  const backlogAssignees = extractDevelopers(issues);
  const developers = await mergeDevelopersWithOrgTeam(organizationId, boardIdNum, backlogAssignees);
  return {
    tasks,
    developers,
    pagination: {
      page: pageNum,
      perPage: perPageNum,
      totalPages,
      totalCount,
    },
  };
}
