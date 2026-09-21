import { redirect } from 'next/navigation';

import { getCachedAdminOrganizationContext } from '@/lib/access/adminOrganizationContext';
import { getVerifiedProductUserIdFromServerCookies } from '@/lib/auth';

export default async function AdminPage() {
  const userId = await getVerifiedProductUserIdFromServerCookies();
  if (!userId) {
    redirect('/login?next=/admin');
  }
  const { activeOrganizationId, orgs } = await getCachedAdminOrganizationContext(userId);
  if (orgs.length === 0) {
    redirect('/admin/org');
  }
  const active =
    orgs.find((o) => o.organization_id === activeOrganizationId && o.canAccessAdmin) ??
    orgs.find((o) => o.canAccessAdmin);
  if (!active) {
    redirect('/admin/tracker');
  }
  if (active.role === 'org_admin') {
    redirect('/admin/org');
  }
  redirect('/admin/teams');
}
