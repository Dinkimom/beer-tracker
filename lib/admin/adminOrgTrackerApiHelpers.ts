import type { OrganizationIssueTrackerConfig } from '@/lib/issueTrackerProvider/settings';
import type { OrganizationRow } from '@/lib/organizations/types';

import { NextResponse } from 'next/server';

import { createAdminTrackerMetadataAxios } from '@/lib/admin/adminTrackerMetadataRouteHelpers';
import {
  readIssueTrackerBasicAuthEmail,
  readIssueTrackerCloudId,
} from '@/lib/issueTrackerProvider/settings';
import { findOrganizationById } from '@/lib/organizations';
import {
  getOrganizationTrackerCredentials,
  type OrganizationTrackerCredentials,
} from '@/lib/organizations/organizationTrackerCredentials';
import { requireOrganizationIssueTrackerConfig, TrackerApiConfigError } from '@/lib/trackerRequestConfig';

import { requireOrgAdminForOrganizationRoute } from './adminOrgRouteHelpers';

/** Трекер организации (site REST URL для org-токена, не OAuth-шлюз). */
export function resolveAdminOrgIssueTracker(
  org: Pick<OrganizationRow, 'settings'>
): NextResponse | OrganizationIssueTrackerConfig {
  try {
    return requireOrganizationIssueTrackerConfig(org);
  } catch (e) {
    if (e instanceof TrackerApiConfigError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

async function resolveOrgTrackerCredentials(
  orgId: string,
  missingTokenMessage: string
): Promise<NextResponse | OrganizationTrackerCredentials> {
  try {
    const credentials = await getOrganizationTrackerCredentials(orgId);
    if (!credentials?.accessToken.trim()) {
      return NextResponse.json({ error: missingTokenMessage }, { status: 422 });
    }
    return { ...credentials, accessToken: credentials.accessToken.trim() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function requireAdminOrgTrackerApi(
  request: Request,
  organizationId: string,
  missingTokenMessage: string
): Promise<
  | NextResponse
  | {
      api: ReturnType<typeof createAdminTrackerMetadataAxios>;
      org: NonNullable<Awaited<ReturnType<typeof findOrganizationById>>>;
      tracker: OrganizationIssueTrackerConfig;
    }
> {
  const auth = await requireOrgAdminForOrganizationRoute(request, organizationId);
  if ('response' in auth) {
    return auth.response;
  }
  const org = await findOrganizationById(auth.ctx.organizationId);
  if (!org) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
  }
  if (!org.tracker_org_id?.trim()) {
    return NextResponse.json(
      { error: 'Сначала укажите Cloud Organization ID в разделе «Яндекс Трекер».' },
      { status: 422 }
    );
  }
  const tracker = resolveAdminOrgIssueTracker(org);
  if (tracker instanceof NextResponse) {
    return tracker;
  }
  const credentials = await resolveOrgTrackerCredentials(auth.ctx.organizationId, missingTokenMessage);
  if (credentials instanceof NextResponse) {
    return credentials;
  }
  const api = createAdminTrackerMetadataAxios({
    apiUrl: tracker.apiUrl,
    cloudId: readIssueTrackerCloudId(org.settings),
    credentials,
    jiraEmail: readIssueTrackerBasicAuthEmail(org.settings),
    orgId: org.tracker_org_id.trim(),
    providerKind: tracker.kind,
  });
  return { api, org, tracker };
}
