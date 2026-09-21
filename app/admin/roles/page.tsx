import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { AdminRolesPageClient } from '@/features/admin/roles/AdminRolesPageClient';
import { getCachedAdminOrganizationContext } from '@/lib/access/adminOrganizationContext';
import { getVerifiedProductUserIdFromServerCookies } from '@/lib/auth';
import { getEffectiveRoles } from '@/lib/roles/effectiveCatalog';
import { listOrgRoles } from '@/lib/roles/orgRolesRepository';
import { listSystemRoles } from '@/lib/roles/systemRolesRepository';

export default async function RolesPage() {
  const userId = await getVerifiedProductUserIdFromServerCookies();
  if (!userId) {
    redirect('/login?next=/admin/roles');
  }

  const { activeOrganizationId, orgs } = await getCachedAdminOrganizationContext(userId);
  const adminOrg = orgs.find((o) => o.organization_id === activeOrganizationId);
  if (!adminOrg || adminOrg.role !== 'org_admin') {
    const fallbackOrg = orgs.find((o) => o.canAccessAdmin)?.organization_id;
    if (fallbackOrg) {
      redirect('/admin/teams');
    }
    redirect('/admin/tracker');
  }

  const resolvedOrgId = adminOrg.organization_id;

  const [systemRows, orgRows] = await Promise.all([
    listSystemRoles(),
    listOrgRoles(resolvedOrgId),
  ]);
  const roles = getEffectiveRoles(systemRows, orgRows);

  return (
    <Suspense>
      <AdminRolesPageClient key={resolvedOrgId} organizationId={resolvedOrgId} roles={roles} />
    </Suspense>
  );
}
