import type {
  SprintContextCapacityPerson,
  SprintContextCapacityReport,
  SprintContextTeamMember,
} from '@/lib/sprints/sprintContextTypes';
import type { Developer } from '@/types';

import { roleCatalogEntriesToResolutionSlices } from '@/lib/roles/catalog';
import { getEffectiveRoles } from '@/lib/roles/effectiveCatalog';
import { listOrgRoles } from '@/lib/roles/orgRolesRepository';
import { listSystemRoles } from '@/lib/roles/systemRolesRepository';
import {
  enrichPlannerTeamMembersFromTracker,
  fetchAllTeamMembersForOrg,
  fetchTeamMembersByBoardIdForOrg,
} from '@/lib/staffTeams';
import { convertTeamMembersToDevelopers } from '@/lib/teamMemberUtils';

async function loadRoleResolutionContext(organizationId: string) {
  const [systemRows, orgRows] = await Promise.all([
    listSystemRoles(),
    listOrgRoles(organizationId),
  ]);
  return roleCatalogEntriesToResolutionSlices(getEffectiveRoles(systemRows, orgRows));
}

export function sprintContextTeamMemberFromDeveloper(
  developer: Developer
): SprintContextTeamMember {
  const member: SprintContextTeamMember = {
    assigneeId: developer.id,
    assigneeName: developer.name,
    role: developer.role,
  };
  if (developer.email) {
    member.email = developer.email;
  }
  if (developer.roleTitle) {
    member.roleTitle = developer.roleTitle;
  }
  if (developer.platforms && developer.platforms.length > 0) {
    member.platforms = developer.platforms;
  }
  if (developer.id.startsWith('staff:')) {
    member.staffUid = developer.id.slice('staff:'.length);
  }
  return member;
}

/** Состав команды доски спринта с доменными ролями (developer/tester/other). */
export async function loadSprintContextTeamMembers(input: {
  boardId?: number;
  organizationId: string;
}): Promise<SprintContextTeamMember[]> {
  if (input.boardId == null || !Number.isFinite(input.boardId)) {
    return [];
  }
  try {
    const [teamMembersRaw, roleCtx] = await Promise.all([
      fetchTeamMembersByBoardIdForOrg(input.organizationId, input.boardId),
      loadRoleResolutionContext(input.organizationId),
    ]);
    const teamMembers = await enrichPlannerTeamMembersFromTracker(
      input.organizationId,
      teamMembersRaw
    );
    return convertTeamMembersToDevelopers(teamMembers, roleCtx).map(
      sprintContextTeamMemberFromDeveloper
    );
  } catch (error) {
    console.warn(
      `[sprint-context] team members(board ${input.boardId}):`,
      error
    );
    return [];
  }
}

/** Роли staff по org (для resolve_person): ключ — staffUid или trackerId / staff:uuid. */
export async function loadOrgTeamMemberRoleIndex(
  organizationId: string
): Promise<Map<string, SprintContextTeamMember>> {
  try {
    const [teamMembersRaw, roleCtx] = await Promise.all([
      fetchAllTeamMembersForOrg(organizationId),
      loadRoleResolutionContext(organizationId),
    ]);
    const developers = convertTeamMembersToDevelopers(teamMembersRaw, roleCtx);
    const byKey = new Map<string, SprintContextTeamMember>();
    for (const developer of developers) {
      const member = sprintContextTeamMemberFromDeveloper(developer);
      byKey.set(member.assigneeId, member);
      if (member.staffUid) {
        byKey.set(member.staffUid, member);
        byKey.set(`staff:${member.staffUid}`, member);
      }
    }
    return byKey;
  } catch (error) {
    console.warn('[sprint-context] org team role index:', error);
    return new Map();
  }
}

export function lookupTeamMemberRole(
  index: Map<string, SprintContextTeamMember>,
  keys: Array<string | null | undefined>
): SprintContextTeamMember | undefined {
  for (const key of keys) {
    const trimmed = key?.trim();
    if (!trimmed) {
      continue;
    }
    const hit = index.get(trimmed);
    if (hit) {
      return hit;
    }
  }
  return undefined;
}

function stampPersonRole(
  person: SprintContextCapacityPerson,
  rolesByAssignee: Map<string, SprintContextTeamMember>
): SprintContextCapacityPerson {
  const member = rolesByAssignee.get(person.assigneeId);
  if (!member) {
    return person;
  }
  return {
    ...person,
    role: member.role,
    ...(member.roleTitle ? { roleTitle: member.roleTitle } : {}),
    ...(member.platforms ? { platforms: member.platforms } : {}),
  };
}

/** Проставляет role/roleTitle/platforms на capacity.people по составу команды. */
export function stampCapacityWithTeamRoles(
  capacity: SprintContextCapacityReport,
  teamMembers: readonly SprintContextTeamMember[]
): SprintContextCapacityReport {
  if (teamMembers.length === 0) {
    return capacity;
  }
  const byAssignee = new Map(teamMembers.map((member) => [member.assigneeId, member]));
  return {
    ...capacity,
    overloaded: capacity.overloaded.map((row) => {
      const member = byAssignee.get(row.assigneeId);
      if (!member) {
        return row;
      }
      return {
        ...row,
        role: member.role,
        ...(member.roleTitle ? { roleTitle: member.roleTitle } : {}),
      };
    }),
    people: capacity.people.map((person) => stampPersonRole(person, byAssignee)),
  };
}
