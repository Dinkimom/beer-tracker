/**
 * Слияние строк system_roles и org_roles в единый список RoleCatalogEntry (без обращения к БД).
 */

import type { RoleCatalogEntry } from '@/lib/roles/catalog';
import type { OrgRoleRow } from '@/lib/roles/orgRolesRepository';
import type { SystemRoleRow } from '@/lib/roles/systemRolesRepository';

/** isSystem: true — строка из таблицы system_roles */
export function systemRoleToEntry(row: SystemRoleRow): RoleCatalogEntry {
  return {
    domainRole: row.domain_role,
    isSystem: true,
    platforms: [...row.platforms],
    slug: row.slug,
    title: row.title,
  };
}

/** isSystem: false — строка из таблицы org_roles */
export function orgRoleToEntry(row: OrgRoleRow): RoleCatalogEntry {
  return {
    domainRole: row.domain_role,
    isSystem: false,
    platforms: [...row.platforms],
    slug: row.slug,
    title: row.title,
  };
}

/**
 * Системные роли первыми (ожидается уже отсортированный список из listSystemRoles),
 * затем роли организации (ожидается порядок из listOrgRoles).
 */
export function getEffectiveRoles(
  systemRows: SystemRoleRow[],
  orgRows: OrgRoleRow[]
): RoleCatalogEntry[] {
  return [...systemRows.map(systemRoleToEntry), ...orgRows.map(orgRoleToEntry)];
}
