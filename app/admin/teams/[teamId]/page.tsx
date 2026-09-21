import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { AdminTeamDetailClient } from '@/features/admin/teams/[teamId]/AdminTeamDetailClient';
import { getCachedAdminOrganizationContext } from '@/lib/access/adminOrganizationContext';
import {
  canManageTeamInAdmin,
  isOrganizationAdminProfile,
  resolveAccessProfile,
} from '@/lib/access/orgAccess';
import { getVerifiedProductUserIdFromServerCookies } from '@/lib/auth';
import { findTeamById, listTeamMembersWithStaff } from '@/lib/staffTeams';

interface TeamDetailPageProps {
  params: Promise<{ teamId: string }>;
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { teamId } = await params;

  const userId = await getVerifiedProductUserIdFromServerCookies();
  if (!userId) {
    redirect(`/login?next=/admin/teams/${teamId}`);
  }

  const { activeOrganizationId, orgs } = await getCachedAdminOrganizationContext(userId);
  const primary =
    orgs.find((o) => o.organization_id === activeOrganizationId && o.canAccessAdmin) ??
    orgs.find((o) => o.canAccessAdmin);
  if (!primary) {
    redirect('/admin/tracker');
  }

  const orgId = primary.organization_id;
  const profile = await resolveAccessProfile(userId, orgId);
  if (!profile || !canManageTeamInAdmin(profile, teamId)) {
    redirect('/admin/teams');
  }

  const team = await findTeamById(orgId, teamId);
  if (!team) {
    redirect('/admin/teams');
  }

  const listed = await listTeamMembersWithStaff(orgId, teamId);
  const isOrgAdmin = isOrganizationAdminProfile(profile);

  return (
    <Suspense>
      <AdminTeamDetailClient
        initialMembers={listed}
        initialTeam={{
          active: team.active,
          id: team.id,
          slug: team.slug,
          title: team.title,
          tracker_board_id: team.tracker_board_id,
          tracker_queue_key: team.tracker_queue_key,
        }}
        isOrgAdmin={isOrgAdmin}
        orgId={orgId}
      />
    </Suspense>
  );
}
