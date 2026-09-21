import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { AdminOrgPageClient } from '@/features/admin/org/AdminOrgPageClient';
import { getCachedAdminOrganizationContext } from '@/lib/access/adminOrganizationContext';
import { resolvePrimaryAdminOrganization } from '@/lib/access/resolvePrimaryAdminOrganization';
import { getVerifiedProductUserIdFromServerCookies } from '@/lib/auth';

export default async function OrgPage() {
  const userId = await getVerifiedProductUserIdFromServerCookies();
  if (!userId) {
    redirect('/login?next=/admin/org');
  }
  const { activeOrganizationId, orgs } = await getCachedAdminOrganizationContext(userId);
  const active =
    orgs.find((o) => o.organization_id === activeOrganizationId) ??
    resolvePrimaryAdminOrganization(orgs);
  if (active && active.role !== 'org_admin') {
    redirect('/admin/tracker');
  }
  return (
    <Suspense>
      <AdminOrgPageClient initialOrgs={orgs} />
    </Suspense>
  );
}
