import type { UserOrganizationSummary } from '@/lib/organizations';

/**
 * Организация контекста админки: сначала с {@link UserOrganizationSummary.canAccessAdmin},
 * иначе первая организация (участник без org_admin всё равно может настраивать трекер).
 */
export function resolvePrimaryAdminOrganization(
  orgs: readonly UserOrganizationSummary[]
): UserOrganizationSummary | null {
  return orgs.find((o) => o.canAccessAdmin) ?? orgs[0] ?? null;
}

export function resolvePrimaryAdminOrganizationId(
  orgs: readonly UserOrganizationSummary[]
): string {
  return resolvePrimaryAdminOrganization(orgs)?.organization_id ?? '';
}
