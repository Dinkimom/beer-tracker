/**
 * Членство пользователей в организации:
 * - админ-права из beer_tracker.admins (staff_uid = staff.id)
 * - идентичность из beer_tracker.staff.
 */

import type {
  OrganizationMemberRow,
  OrgMemberRole,
  UserOrganizationSummary,
} from './types';

import { countAdmins, deleteAdmin, insertAdmin } from '@/lib/auth/adminsRepository';
import { isProductSuperAdmin } from '@/lib/auth/superAdmin';
import { findUserById } from '@/lib/auth/userRepository';
import { query } from '@/lib/db';
import { findOrganizationById, listAllOrganizationsAdminSummaries } from '@/lib/organizations/organizationRepository';

import {
  NATIVE_ORGANIZATION_MEMBER_DIRECTORY_SQL,
  NATIVE_REGISTRY_EMPLOYEES_DIRECTORY_SQL,
} from './organizationMembersNativeSql';

/** Команды пользователя в организации (из user_team_memberships). */
interface OrganizationMemberDirectoryTeam {
  is_team_lead: boolean;
  is_team_member: boolean;
  team_id: string;
  title: string;
}

function parseMemberDirectoryTeamsFromJsonString(raw: string): OrganizationMemberDirectoryTeam[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OrganizationMemberDirectoryTeam[]) : [];
  } catch {
    return [];
  }
}

function virtualMembership(
  organizationId: string,
  userId: string,
  role: OrgMemberRole,
  createdAt: Date
): OrganizationMemberRow {
  return {
    id: `${organizationId}:${userId}`,
    organization_id: organizationId,
    user_id: userId,
    role,
    created_at: createdAt,
  };
}

export async function findOrganizationMembership(
  organizationId: string,
  userId: string
): Promise<OrganizationMemberRow | null> {
  const [org, user] = await Promise.all([findOrganizationById(organizationId), findUserById(userId)]);
  if (!org || !user) {
    return null;
  }
  const role: OrgMemberRole = (await isProductSuperAdmin(user.id)) ? 'org_admin' : 'member';
  return virtualMembership(organizationId, user.id, role, user.created_at);
}

export async function listUserOrganizations(
  userId: string
): Promise<UserOrganizationSummary[]> {
  const user = await findUserById(userId);
  if (!user) {
    return [];
  }
  const orgs = await listAllOrganizationsAdminSummaries();
  if (await isProductSuperAdmin(user.id)) {
    return orgs;
  }
  return orgs.map((o) => ({ ...o, role: 'member' as const }));
}

export async function listOrganizationMembers(
  organizationId: string
): Promise<OrganizationMemberRow[]> {
  const org = await findOrganizationById(organizationId);
  if (!org) {
    return [];
  }
  const res = await query<OrganizationMemberRow>(
    `SELECT s.id::text AS id,
            $1::uuid AS organization_id,
            s.id::text AS user_id,
            CASE WHEN a.staff_uid IS NOT NULL THEN 'org_admin' ELSE 'member' END AS role,
            s.created_at
     FROM staff s
     LEFT JOIN admins a ON a.staff_uid = s.id
     WHERE s.organization_id = $1
     ORDER BY s.display_name ASC`,
    [organizationId]
  );
  return res.rows as OrganizationMemberRow[];
}

export function parseMemberDirectoryTeamsJson(raw: unknown): OrganizationMemberDirectoryTeam[] {
  if (raw == null) {
    return [];
  }
  if (typeof raw === 'string') {
    return parseMemberDirectoryTeamsFromJsonString(raw);
  }
  return Array.isArray(raw) ? (raw as OrganizationMemberDirectoryTeam[]) : [];
}

/** Все участники организации с email и признаком membership в командах org (user_team_memberships). */
interface OrganizationMemberDirectoryRow {
  created_at: Date;
  email: string;
  has_team_membership: boolean;
  org_role: OrgMemberRole;
  teams_json: OrganizationMemberDirectoryTeam[] | null;
  user_id: string;
}

export interface RegistryEmployeeDirectoryRow {
  avatar_link: string | null;
  email: string | null;
  employee_id: string;
  fired_date: string | null;
  full_name: string | null;
  is_org_admin: boolean;
  name: string | null;
  patronymic: string | null;
  staff_uid: string;
  status: string | null;
  surname: string | null;
  teams: Array<{ team_id: string; team_title: string }>;
  tracker_id: string | null;
}

export async function listRegistryEmployeesDirectory(
  organizationId: string
): Promise<RegistryEmployeeDirectoryRow[]> {
  const org = await findOrganizationById(organizationId);
  if (!org) {
    return [];
  }

  const nativeRes = await query<RegistryEmployeeDirectoryRow>(
    `SELECT ${NATIVE_REGISTRY_EMPLOYEES_DIRECTORY_SQL}`,
    [organizationId]
  );
  return nativeRes.rows.map((row) => ({
    ...row,
    is_org_admin: Boolean(row.is_org_admin),
    teams: Array.isArray(row.teams) ? row.teams : [],
  }));
}

export async function listOrganizationMemberDirectory(
  organizationId: string
): Promise<OrganizationMemberDirectoryRow[]> {
  const org = await findOrganizationById(organizationId);
  if (!org) {
    return [];
  }
  const nativeRes = await query<OrganizationMemberDirectoryRow>(
    `SELECT ${NATIVE_ORGANIZATION_MEMBER_DIRECTORY_SQL}`,
    [organizationId]
  );
  return nativeRes.rows;
}

export async function insertOrganizationMember(
  organizationId: string,
  userId: string,
  role: OrgMemberRole
): Promise<OrganizationMemberRow> {
  const user = await findUserById(userId);
  const org = await findOrganizationById(organizationId);
  if (!user || !org) {
    throw new Error('insertOrganizationMember: user or organization not found');
  }
  if (role === 'org_admin') {
    await insertAdmin(userId);
  }
  return (await findOrganizationMembership(organizationId, userId)) as OrganizationMemberRow;
}

export async function countOrganizationMembersByRole(
  organizationId: string,
  role: OrgMemberRole
): Promise<number> {
  const org = await findOrganizationById(organizationId);
  if (!org) {
    return 0;
  }
  if (role === 'org_admin') {
    return countAdmins();
  }
  const nativeRes = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM staff s
     WHERE s.organization_id = $1
       AND NOT EXISTS (SELECT 1 FROM admins a WHERE a.staff_uid = s.id)`,
    [organizationId]
  );
  const nativeCount = Number.parseInt(nativeRes.rows[0]?.count ?? '0', 10);
  return Number.isFinite(nativeCount) ? nativeCount : 0;
}

export async function updateOrganizationMemberRole(
  organizationId: string,
  userId: string,
  role: OrgMemberRole
): Promise<OrganizationMemberRow | null> {
  const current = await findOrganizationMembership(organizationId, userId);
  if (!current) {
    return null;
  }
  if (role === 'org_admin') {
    await insertAdmin(userId);
  } else {
    await deleteAdmin(userId);
  }
  return findOrganizationMembership(organizationId, userId);
}
