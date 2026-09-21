import type { CustomSelectOption } from '@/components/CustomSelect';
import type { AdminTrackerCatalogPayload } from '@/features/admin/adminTeamCatalog';
import type { RoleCatalogEntry } from '@/lib/roles/catalog';

import { fetchAdminOrgRoleCatalog } from '@/lib/api/admin/roles';
import { fetchAdminTrackerCatalog } from '@/lib/api/admin/teams';

type Translate = (key: string) => string;

function roleSelectOptionsFromCatalog(
  roles: RoleCatalogEntry[],
  t: Translate
): CustomSelectOption<string>[] {
  return [
    { label: t('admin.teamDetail.noRole'), value: '' },
    ...roles.map((r) => ({ label: r.title, value: r.slug })),
  ];
}

async function fetchTeamRoles(orgId: string): Promise<RoleCatalogEntry[] | null> {
  try {
    return await fetchAdminOrgRoleCatalog(orgId);
  } catch {
    return null;
  }
}

async function loadNonOrgAdminCatalog(
  orgId: string,
  t: Translate
): Promise<CustomSelectOption<string>[] | null> {
  try {
    const roles = await fetchTeamRoles(orgId);
    if (!roles) return null;
    return roleSelectOptionsFromCatalog(roles, t);
  } catch {
    return null;
  }
}

function parseTrackerCatalogPayload(
  data: AdminTrackerCatalogPayload
): AdminTrackerCatalogPayload {
  return {
    boards: Array.isArray(data.boards) ? data.boards : [],
    queues: Array.isArray(data.queues) ? data.queues : [],
    teams: Array.isArray(data.teams) ? data.teams : [],
  };
}

function parseTeamRolesPayload(
  roles: RoleCatalogEntry[] | undefined,
  t: Translate
): CustomSelectOption<string>[] | null {
  if (!Array.isArray(roles)) {
    return null;
  }
  return roleSelectOptionsFromCatalog(roles, t);
}

async function loadOrgAdminCatalog(
  orgId: string,
  t: Translate
): Promise<{
  catalog: AdminTrackerCatalogPayload | null;
  roleOptions: CustomSelectOption<string>[] | null;
}> {
  const [catalogResult, rolesResult] = await Promise.allSettled([
    fetchAdminTrackerCatalog(orgId),
    fetchAdminOrgRoleCatalog(orgId),
  ]);

  let catalog: AdminTrackerCatalogPayload | null = null;
  if (catalogResult.status === 'fulfilled') {
    catalog = parseTrackerCatalogPayload(catalogResult.value);
  }

  let roleOptions: CustomSelectOption<string>[] | null = null;
  if (rolesResult.status === 'fulfilled') {
    roleOptions = parseTeamRolesPayload(rolesResult.value, t);
  }

  return { catalog, roleOptions };
}

async function loadOrgAdminTeamDetailCatalog(
  orgId: string,
  t: Translate,
  setCatalog: (catalog: AdminTrackerCatalogPayload) => void,
  setRoleOptions: (options: CustomSelectOption<string>[]) => void
): Promise<void> {
  const { catalog: nextCatalog, roleOptions } = await loadOrgAdminCatalog(orgId, t);
  if (nextCatalog) setCatalog(nextCatalog);
  if (roleOptions) setRoleOptions(roleOptions);
}

function shouldSkipTeamDetailCatalogLoad(
  orgId: string,
  isOrgAdmin: boolean,
  catalog: AdminTrackerCatalogPayload | null
): boolean {
  if (!orgId) {
    return true;
  }
  return isOrgAdmin && catalog !== null;
}

async function loadTeamDetailCatalogForNonOrgAdmin(
  orgId: string,
  t: Translate,
  setRoleOptions: (options: CustomSelectOption<string>[]) => void
): Promise<void> {
  const roleOptions = await loadNonOrgAdminCatalog(orgId, t);
  if (roleOptions) {
    setRoleOptions(roleOptions);
  }
}

export async function runLoadTeamDetailCatalog(params: {
  catalog: AdminTrackerCatalogPayload | null;
  isOrgAdmin: boolean;
  orgId: string;
  setCatalog: (catalog: AdminTrackerCatalogPayload) => void;
  setCatalogLoading: (loading: boolean) => void;
  setRoleOptions: (options: CustomSelectOption<string>[]) => void;
  t: Translate;
}): Promise<void> {
  const { catalog, isOrgAdmin, orgId, setCatalog, setCatalogLoading, setRoleOptions, t } = params;
  if (shouldSkipTeamDetailCatalogLoad(orgId, isOrgAdmin, catalog)) {
    return;
  }

  if (!isOrgAdmin) {
    await loadTeamDetailCatalogForNonOrgAdmin(orgId, t, setRoleOptions);
    return;
  }

  setCatalogLoading(true);
  try {
    await loadOrgAdminTeamDetailCatalog(orgId, t, setCatalog, setRoleOptions);
  } catch {
    /* ignore */
  } finally {
    setCatalogLoading(false);
  }
}
