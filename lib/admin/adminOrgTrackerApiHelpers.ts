import { NextResponse } from 'next/server';

import { createAdminTrackerMetadataAxios } from '@/lib/admin/adminTrackerMetadataRouteHelpers';
import { readIssueTrackerBasicAuthEmail } from '@/lib/issueTrackerProvider/settings';
import { findOrganizationById, getDecryptedOrganizationTrackerToken } from '@/lib/organizations';
import { resolveTrackerApiBaseUrlForOrganizationRow } from '@/lib/trackerRequestConfig';

import { requireOrgMemberForOrganizationRoute } from './adminOrgRouteHelpers';

async function resolveDecryptedOrgTrackerToken(
  orgId: string,
  missingTokenMessage: string
): Promise<NextResponse | { token: string }> {
  try {
    const token = await getDecryptedOrganizationTrackerToken(orgId);
    if (!token?.trim()) {
      return NextResponse.json({ error: missingTokenMessage }, { status: 422 });
    }
    return { token: token.trim() };
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
    }
> {
  const auth = await requireOrgMemberForOrganizationRoute(request, organizationId);
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
  const tokenResult = await resolveDecryptedOrgTrackerToken(auth.ctx.organizationId, missingTokenMessage);
  if (!('token' in tokenResult)) {
    return tokenResult;
  }
  const api = createAdminTrackerMetadataAxios({
    apiUrl: resolveTrackerApiBaseUrlForOrganizationRow(org),
    jiraEmail: readIssueTrackerBasicAuthEmail(org.settings),
    orgId: org.tracker_org_id.trim(),
    token: tokenResult.token,
  });
  return { api, org };
}
