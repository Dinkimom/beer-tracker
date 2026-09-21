import { NextResponse } from 'next/server';

import { handleApiError, TRACKER_UPSTREAM_FORWARD_STATUSES } from '@/lib/api-error-handler';
import { getProductUserIdFromRequest } from '@/lib/auth/productSession';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { findOrganizationMembership } from '@/lib/organizations/organizationMembersRepository';
import { parseRegistryUuidString } from '@/lib/registryUuidString';
import { getStaffByTrackerUserIdInOrg } from '@/lib/staffTeams';
import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';

/**
 * GET /api/auth/myself
 * Данные текущего пользователя из Tracker (/myself).
 * Аватар и birthdate — из staff организации, если передан {@link TENANT_ORG_HEADER} и есть членство.
 */
export async function GET(request: Request) {
  try {
    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const data = await issueTracker.getCurrentUser();

    let avatarUrl: string | null = null;
    let birthdate: string | null = null;
    try {
      const trackerId = (data?.trackerUid ?? data?.uid)?.toString();
      const userId = getProductUserIdFromRequest(request);
      const organizationId = parseRegistryUuidString(request.headers.get(TENANT_ORG_HEADER));
      if (trackerId && userId && organizationId) {
        const membership = await findOrganizationMembership(organizationId, userId);
        if (membership) {
          const staff = await getStaffByTrackerUserIdInOrg(organizationId, trackerId);
          avatarUrl = staff?.avatarUrl ?? null;
          birthdate = staff?.birthdate ?? null;
        }
      }
    } catch (registryError) {
      console.warn('[auth/myself] Failed to enrich from staff:', registryError);
    }

    return NextResponse.json({
      ...data,
      avatarUrl,
      birthdate,
    });
  } catch (error) {
    return handleApiError(error, 'get current user (myself)', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
