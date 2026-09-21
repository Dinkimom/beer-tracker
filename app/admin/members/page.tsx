import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { AdminMembersPageClient } from '@/features/admin/members/AdminMembersPageClient';
import { getCachedAdminOrganizationContext } from '@/lib/access/adminOrganizationContext';
import { getVerifiedProductUserIdFromServerCookies } from '@/lib/auth';
import { listRegistryEmployeesDirectory } from '@/lib/organizations/organizationMembersRepository';
import { listTeams } from '@/lib/staffTeams';

export default async function MembersPage() {
  const userId = await getVerifiedProductUserIdFromServerCookies();
  if (!userId) {
    redirect('/login?next=/admin/members');
  }

  const { activeOrganizationId, orgs } = await getCachedAdminOrganizationContext(userId);
  const adminOrg = orgs.find((o) => o.organization_id === activeOrganizationId);
  if (!adminOrg || adminOrg.role !== 'org_admin') {
    redirect('/admin/tracker');
  }

  const connectOrgId = adminOrg.organization_id;
  const [rows, teams] = await Promise.all([
    listRegistryEmployeesDirectory(connectOrgId),
    listTeams(connectOrgId, { activeOnly: true }),
  ]);
  const teamOptions = teams.map((team) => ({ id: team.id, title: team.title }));

  return (
    <Suspense>
      <AdminMembersPageClient
        currentUserId={userId}
        orgId={connectOrgId}
        rows={rows}
        teamOptions={teamOptions}
      />
    </Suspense>
  );
}
