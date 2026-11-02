/**
 * Профиль доступа пользователя в организации (роли + команды). Источник прав для API и сессии.
 */

import type { OrgMemberRole, UserOrganizationSummary } from '@/lib/organizations/types';

import { isProductSuperAdmin } from '@/lib/auth/superAdmin';
import { findOrganizationMembership } from '@/lib/organizations/organizationMembersRepository';
import { findOrganizationById } from '@/lib/organizations/organizationRepository';
import { listUserTeamMembershipsInOrganization } from '@/lib/organizations/userTeamMembershipRepository';

interface TeamAccessEntry {
  isTeamLead: boolean;
  isTeamMember: boolean;
  teamId: string;
}

export interface AccessProfile {
  organizationId: string;
  orgRole: OrgMemberRole;
  teamMemberships: TeamAccessEntry[];
  userId: string;
}

export function canAccessAdminShell(profile: AccessProfile): boolean {
  return profile.orgRole === 'org_admin';
}

export function isOrganizationAdminProfile(profile: AccessProfile): boolean {
  return profile.orgRole === 'org_admin';
}

export function isTeamLeadForTeam(profile: AccessProfile, teamId: string): boolean {
  return profile.teamMemberships.some((t) => t.teamId === teamId && t.isTeamLead);
}

/** Настройки команды и состав: только администратор организации. */
export function canManageTeamInAdmin(profile: AccessProfile, _teamId: string): boolean {
  return isOrganizationAdminProfile(profile);
}

/**
 * Любой участник организации (профиль есть только у них): доски всех команд org открыты всем,
 * членство в команде решает только, кто стоит на доске.
 * Когда появятся приватные доски, проверка «можно ли открыть доску» ляжет сюда и в
 * `listPlannerBoardsForAccessProfile`; роуты спринта тогда тоже должны проверять команду.
 */
export function canUsePlanner(_profile: AccessProfile): boolean {
  return true;
}

/**
 * Команды, которыми пользователь управляет в админке.
 * `null` — org_admin (все команды организации); иначе пустой список (тимлид каталога не даёт ACL).
 */
export function managedTeamIdsForAccessProfile(profile: AccessProfile): string[] | null {
  if (profile.orgRole === 'org_admin') {
    return null;
  }
  return [];
}

/** Команды, в составе которых пользователь (member или lead): «свои» доски в планере. */
export function myTeamIdsForAccessProfile(profile: AccessProfile): Set<string> {
  return new Set(profile.teamMemberships.map((m) => m.teamId));
}

export async function resolveAccessProfile(
  userId: string,
  organizationId: string
): Promise<AccessProfile | null> {
  const membership = await findOrganizationMembership(organizationId, userId);
  if (membership) {
    const rows = await listUserTeamMembershipsInOrganization(organizationId, userId);
    const teamMemberships: TeamAccessEntry[] = rows.map((r) => ({
      isTeamLead: r.is_team_lead,
      isTeamMember: r.is_team_member,
      teamId: r.team_id,
    }));
    return {
      organizationId,
      orgRole: membership.role,
      teamMemberships,
      userId,
    };
  }
  if (await isProductSuperAdmin(userId)) {
    const org = await findOrganizationById(organizationId);
    if (!org) {
      return null;
    }
    return {
      organizationId,
      orgRole: 'org_admin',
      teamMemberships: [],
      userId,
    };
  }
  return null;
}

/** Добавляет canAccessAdmin / canUsePlanner к строкам из listUserOrganizations. */
export async function enrichOrganizationSummariesForUser(
  userId: string,
  summaries: UserOrganizationSummary[]
): Promise<UserOrganizationSummary[]> {
  return await Promise.all(
    summaries.map(async (o) => {
      const profile = await resolveAccessProfile(userId, o.organization_id);
      if (!profile) {
        return {
          ...o,
          canAccessAdmin: false,
          canUsePlanner: false,
          managedTeamIds: [],
        };
      }
      return {
        ...o,
        canAccessAdmin: canAccessAdminShell(profile),
        canUsePlanner: canUsePlanner(profile),
        managedTeamIds: managedTeamIdsForAccessProfile(profile),
      };
    })
  );
}
