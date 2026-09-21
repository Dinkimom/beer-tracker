import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { AdminTeamsPageClient } from '@/features/admin/teams/AdminTeamsPageClient';
import { getCachedAdminOrganizationContext } from '@/lib/access/adminOrganizationContext';
import {
  isOrganizationAdminProfile,
  resolveAccessProfile,
} from '@/lib/access/orgAccess';
import { getVerifiedProductUserIdFromServerCookies } from '@/lib/auth';
import { listTeams } from '@/lib/staffTeams';

export default async function TeamsPage() {
  const userId = await getVerifiedProductUserIdFromServerCookies();
  if (!userId) {
    redirect('/login?next=/admin/teams');
  }

  const { activeOrganizationId, orgs } = await getCachedAdminOrganizationContext(userId);
  const primary =
    orgs.find((o) => o.organization_id === activeOrganizationId && o.canAccessAdmin) ??
    orgs.find((o) => o.canAccessAdmin);
  if (!primary) {
    redirect('/admin/tracker');
  }

  const resolvedOrgId = primary.organization_id;
  const profile = await resolveAccessProfile(userId, resolvedOrgId);
  if (!profile) {
    redirect('/admin/org');
  }

  const isOrgAdmin = isOrganizationAdminProfile(profile);
  const all = await listTeams(resolvedOrgId, { activeOnly: false });
  const teams = isOrgAdmin
    ? all
    : all.filter((team) =>
        profile.teamMemberships.some((membership) => membership.teamId === team.id && membership.isTeamLead)
      );
  const initialTeams = teams.map((team) => ({
    active: team.active,
    id: team.id,
    slug: team.slug,
    title: team.title,
    tracker_board_id: team.tracker_board_id,
    tracker_queue_key: team.tracker_queue_key,
  }));

  return (
    <Suspense>
      <AdminTeamsPageClient initialTeams={initialTeams} isOrgAdmin={isOrgAdmin} orgId={resolvedOrgId} />
    </Suspense>
  );
}
