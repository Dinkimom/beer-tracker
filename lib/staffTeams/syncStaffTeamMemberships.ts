/**
 * Синхронизация состава команд сотрудника: целевой набор team_id в организации.
 */

import { findStaffById } from './staffRepository';
import {
  addTeamMember,
  listTeamIdsForStaffInOrganization,
  removeTeamMember,
} from './teamMembersRepository';
import { findTeamById } from './teamsRepository';

type SyncStaffTeamMembershipsResult =
  | { error: string; status: number }
  | { ok: true };

function uniqueTeamIds(teamIds: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of teamIds) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

async function assertDesiredTeamsExist(
  organizationId: string,
  teamIds: string[]
): Promise<SyncStaffTeamMembershipsResult | null> {
  for (const teamId of teamIds) {
    const team = await findTeamById(organizationId, teamId);
    if (!team) {
      return { error: 'Команда не найдена', status: 404 };
    }
  }
  return null;
}

async function removeTeamsNotInDesired(
  organizationId: string,
  staffId: string,
  current: string[],
  desiredSet: Set<string>
): Promise<void> {
  for (const teamId of current) {
    if (!desiredSet.has(teamId)) {
      await removeTeamMember(organizationId, teamId, staffId);
    }
  }
}

async function addMissingDesiredTeams(
  organizationId: string,
  staffId: string,
  desired: string[],
  currentSet: Set<string>
): Promise<SyncStaffTeamMembershipsResult | null> {
  for (const teamId of desired) {
    if (currentSet.has(teamId)) continue;
    const member = await addTeamMember(organizationId, teamId, staffId, null);
    if (!member) {
      return { error: 'Не удалось добавить: команда или сотрудник не найдены', status: 404 };
    }
  }
  return null;
}

export async function syncStaffTeamMemberships(
  organizationId: string,
  staffId: string,
  teamIds: string[]
): Promise<SyncStaffTeamMembershipsResult> {
  const staff = await findStaffById(organizationId, staffId);
  if (!staff) {
    return { error: 'Сотрудник не найден', status: 404 };
  }

  const desired = uniqueTeamIds(teamIds);
  const teamsMissing = await assertDesiredTeamsExist(organizationId, desired);
  if (teamsMissing) {
    return teamsMissing;
  }

  const current = await listTeamIdsForStaffInOrganization(organizationId, staffId);
  await removeTeamsNotInDesired(organizationId, staffId, current, new Set(desired));
  const addError = await addMissingDesiredTeams(
    organizationId,
    staffId,
    desired,
    new Set(current)
  );
  if (addError) {
    return addError;
  }

  return { ok: true };
}
