/**
 * GET /api/auth/session: идентичность по cookie (beer_tracker.staff.id).
 */

import type { UserOrganizationSummary } from '@/lib/organizations/types';

import { NextResponse } from 'next/server';

import { enrichOrganizationSummariesForUser } from '@/lib/access/orgAccess';
import { clearProductSessionCookie } from '@/lib/auth/cookies';
import { getProductUserIdFromRequest } from '@/lib/auth/productSession';
import { findUserById } from '@/lib/auth/userRepository';
import { listUserOrganizations } from '@/lib/organizations/organizationMembersRepository';

function emptySessionJson(clearCookie: boolean): NextResponse {
  const res = NextResponse.json({ user: null, organizations: [] });
  if (clearCookie) {
    clearProductSessionCookie(res);
  }
  return res;
}

function mapSessionOrganizations(organizations: UserOrganizationSummary[]) {
  return organizations.map((o) => ({
    canAccessAdmin: o.canAccessAdmin ?? false,
    canUsePlanner: o.canUsePlanner ?? false,
    id: o.organization_id,
    managedTeamIds: o.managedTeamIds ?? (o.role === 'org_admin' ? null : []),
    initialSyncCompletedAt: o.initial_sync_completed_at
      ? new Date(o.initial_sync_completed_at).toISOString()
      : null,
    name: o.name,
    role: o.role,
    slug: o.slug,
  }));
}

async function buildAuthenticatedSessionResponse(
  cookieUserId: string
): Promise<NextResponse> {
  const user = await findUserById(cookieUserId);
  if (!user) {
    return emptySessionJson(true);
  }
  const rawOrgs = await listUserOrganizations(user.id);
  const organizations = await enrichOrganizationSummariesForUser(user.id, rawOrgs);
  return NextResponse.json({
    organizations: mapSessionOrganizations(organizations),
    user: {
      email: user.email,
      emailVerified: true,
      id: user.id,
    },
  });
}

export async function buildProductSessionResponse(request: Request): Promise<NextResponse> {
  const cookieUserId = getProductUserIdFromRequest(request);
  if (!cookieUserId) {
    return emptySessionJson(false);
  }
  try {
    return await buildAuthenticatedSessionResponse(cookieUserId);
  } catch (error) {
    console.error('[auth/session]', error);
    return emptySessionJson(false);
  }
}
