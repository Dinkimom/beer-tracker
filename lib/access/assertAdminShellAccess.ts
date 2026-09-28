import type { UserOrganizationSummary } from '@/lib/organizations/types';

import { forbidden } from 'next/navigation';

/** Есть ли среди организаций доступ к админ-шеллу (`org_admin` / super-admin). */
export function hasAdminShellAccess(orgs: readonly UserOrganizationSummary[]): boolean {
  return orgs.some((o) => o.canAccessAdmin);
}

/**
 * Пустой список org — онбординг (создание первой организации).
 * Иначе без `canAccessAdmin` — HTTP 403 через {@link forbidden}.
 */
export function assertAdminShellAccessOrForbidden(orgs: readonly UserOrganizationSummary[]): void {
  if (orgs.length === 0) {
    return;
  }
  if (!hasAdminShellAccess(orgs)) {
    forbidden();
  }
}
