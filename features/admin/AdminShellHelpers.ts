import type { UserOrganizationSummary } from '@/lib/organizations';

import { PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY } from '@/lib/tenantHttpConstants';

function displayOrgMemberRole(
  role: string,
  has: (key: string) => boolean,
  t: (key: string) => string
): string {
  const key = `admin.shell.orgRole.${role}`;
  return has(key) ? t(key) : role;
}

export function resolveAdminShellRoleLine(
  activeOrg: UserOrganizationSummary | null | undefined,
  isSuperAdmin: boolean,
  has: (key: string) => boolean,
  t: (key: string) => string
): string | null {
  if (!activeOrg) {
    return null;
  }
  if (isSuperAdmin) {
    return t('admin.shell.superAdmin');
  }
  return displayOrgMemberRole(activeOrg.role, has, t);
}

export function persistActiveOrganizationId(connectOrgId: string | null): void {
  if (!connectOrgId) {
    return;
  }
  try {
    localStorage.setItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY, connectOrgId);
  } catch {
    /* ignore */
  }
}
