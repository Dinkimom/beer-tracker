import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

import { adminOrgApiPath } from './paths';

export async function patchAdminOrganizationMemberRole(
  orgId: string,
  userId: string,
  orgRole: 'member' | 'org_admin'
): Promise<void> {
  await getPlannerBeerTrackerApi().patch(adminOrgApiPath(orgId, `members/${userId}`), {
    org_role: orgRole,
  });
}
