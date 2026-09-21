import type { DomainRole, Platform, RoleCatalogEntry } from '@/lib/roles/catalog';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

import { adminOrgApiPath } from './paths';

export async function fetchAdminOrgRoleCatalog(orgId: string): Promise<RoleCatalogEntry[]> {
  const { data } = await getPlannerBeerTrackerApi().get<{ roles: RoleCatalogEntry[] }>(
    adminOrgApiPath(orgId, 'roles')
  );
  return Array.isArray(data.roles) ? data.roles : [];
}

export async function createAdminOrgRole(
  orgId: string,
  payload: {
    domainRole: DomainRole;
    platforms: Platform[];
    slug: string;
    title: string;
  }
): Promise<RoleCatalogEntry> {
  const { data } = await getPlannerBeerTrackerApi().post<{ role: RoleCatalogEntry }>(
    adminOrgApiPath(orgId, 'org-roles'),
    payload
  );
  return data.role;
}

export async function patchAdminOrgRole(
  orgId: string,
  slug: string,
  payload: {
    domainRole: DomainRole;
    platforms: Platform[];
    title: string;
  }
): Promise<RoleCatalogEntry> {
  const { data } = await getPlannerBeerTrackerApi().patch<{ role: RoleCatalogEntry }>(
    `${adminOrgApiPath(orgId, 'org-roles')}/${encodeURIComponent(slug)}`,
    payload
  );
  return data.role;
}

export async function deleteAdminOrgRole(orgId: string, slug: string): Promise<void> {
  await getPlannerBeerTrackerApi().delete(
    `${adminOrgApiPath(orgId, 'org-roles')}/${encodeURIComponent(slug)}`
  );
}
