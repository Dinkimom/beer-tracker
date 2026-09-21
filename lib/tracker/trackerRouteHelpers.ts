import type { Developer } from '@/types';
import type { Task } from '@/types';

import { NextResponse } from 'next/server';

import { sortTasksByOccupancyOrder } from '@/lib/api/sortTasksByOccupancyOrder';
import { roleCatalogEntriesToResolutionSlices } from '@/lib/roles/catalog';
import { getEffectiveRoles } from '@/lib/roles/effectiveCatalog';
import { listOrgRoles } from '@/lib/roles/orgRolesRepository';
import { listSystemRoles } from '@/lib/roles/systemRolesRepository';
import { fetchOccupancyTaskOrder } from '@/lib/sprints';
import {
  enrichPlannerTeamMembersFromTracker,
  fetchTeamMembersByBoardIdForOrg,
  getStaffByTrackerUserIdsInOrg,
} from '@/lib/staffTeams';
import { convertTeamMembersToDevelopers } from '@/lib/teamMemberUtils';

export async function applyOccupancyOrderToTasks(
  organizationId: string,
  sprintIdNum: number,
  tasks: Task[]
): Promise<Task[]> {
  try {
    const orderRow = await fetchOccupancyTaskOrder({
      organizationId,
      sprintId: sprintIdNum,
    });
    if (!orderRow || (orderRow.parentIds.length === 0 && Object.keys(orderRow.taskOrders).length === 0)) {
      return tasks;
    }
    return sortTasksByOccupancyOrder(tasks, {
      parentIds: orderRow.parentIds as string[],
      taskOrders: orderRow.taskOrders as Record<string, string[]>,
    });
  } catch (orderErr) {
    console.warn('[GET /api/tracker] Could not apply occupancy order:', orderErr);
    return tasks;
  }
}

export function filterTrackerTasksByStatus(tasks: Task[], statusFilter: string | null): Task[] {
  if (statusFilter !== 'active' && statusFilter !== 'completed') {
    return tasks;
  }
  const isClosed = (t: { originalStatus?: string }) =>
    (t.originalStatus ?? '').toLowerCase() === 'closed';
  return statusFilter === 'completed'
    ? tasks.filter(isClosed)
    : tasks.filter((t) => !isClosed(t));
}

export async function fetchDevelopersForBoard(
  organizationId: string,
  boardId: string | null
): Promise<Developer[]> {
  if (!boardId) return [];
  const boardIdNum = parseInt(boardId, 10);
  if (Number.isNaN(boardIdNum)) return [];
  try {
    const [teamMembersRaw, systemRows, orgRows] = await Promise.all([
      fetchTeamMembersByBoardIdForOrg(organizationId, boardIdNum),
      listSystemRoles(),
      listOrgRoles(organizationId),
    ]);
    const teamMembers = await enrichPlannerTeamMembersFromTracker(organizationId, teamMembersRaw);
    const roleCtx = roleCatalogEntriesToResolutionSlices(getEffectiveRoles(systemRows, orgRows));
    return convertTeamMembersToDevelopers(teamMembers, roleCtx);
  } catch (err) {
    console.warn('Failed to fetch team members from PostgreSQL:', err);
    return [];
  }
}

export async function enrichDevelopersWithAvatars(
  organizationId: string,
  developers: Developer[]
): Promise<Developer[]> {
  const missingAvatarIds = developers.filter((d) => !d.avatarUrl).map((d) => d.id);
  if (missingAvatarIds.length === 0) {
    return developers;
  }
  try {
    const employees = await getStaffByTrackerUserIdsInOrg(organizationId, missingAvatarIds);
    const avatarMap = new Map(
      employees.filter((e) => e.avatarUrl).map((e) => [e.trackerId, e.avatarUrl!])
    );
    return developers.map((d) =>
      !d.avatarUrl && avatarMap.has(d.id) ? { ...d, avatarUrl: avatarMap.get(d.id) } : d
    );
  } catch (err) {
    console.warn('Failed to fetch avatars for assignees from staff:', err);
    return developers;
  }
}

export function parseValidatedSprintId(
  sprintId: string
): NextResponse | number {
  const sprintIdNum = parseInt(sprintId, 10);
  if (Number.isNaN(sprintIdNum)) {
    return NextResponse.json({ error: 'sprintId must be a valid number' }, { status: 400 });
  }
  return sprintIdNum;
}
