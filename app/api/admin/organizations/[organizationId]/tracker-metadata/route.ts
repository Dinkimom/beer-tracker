import { NextResponse } from 'next/server';

import {
  createAdminTrackerMetadataAxios,
  fetchTrackerMetadataFieldValues,
  loadCachedTrackerOrgMetadata,
  parseTrackerMetadataResource,
  resolveTrackerMetadataToken,
  trackerAdminCatalogConnectionFingerprint,
  trackerMetadataFieldsStatusesResponse,
} from '@/lib/admin/adminTrackerMetadataRouteHelpers';
import { handleApiError, TRACKER_UPSTREAM_FORWARD_STATUSES } from '@/lib/api-error-handler';
import { requireTenantForOrganization } from '@/lib/api-tenant';
import { readIssueTrackerBasicAuthEmail } from '@/lib/issueTrackerProvider/settings';
import {
  findOrganizationById,
  getDecryptedOrganizationTrackerToken,
} from '@/lib/organizations';
import { resolveTrackerApiBaseUrlForOrganizationRow } from '@/lib/trackerRequestConfig';

/**
 * GET /api/admin/organizations/[organizationId]/tracker-metadata?resource=fields|statuses|all|field-values&fieldId=<id>
 * Поля и статусы Tracker v3 (кэш 5 мин).
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  const auth = await requireTenantForOrganization(request, organizationId);
  if (auth.response) {
    return auth.response;
  }
  const orgId = auth.ctx.organizationId;
  const { searchParams } = new URL(request.url);
  const resourceParsed = parseTrackerMetadataResource(searchParams.get('resource'));
  if (resourceParsed instanceof NextResponse) {
    return resourceParsed;
  }
  const resource = resourceParsed;

  const org = await findOrganizationById(orgId);
  if (!org) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
  }
  if (!org.tracker_org_id?.trim()) {
    return NextResponse.json(
      { error: 'Сначала укажите Cloud Organization ID в разделе «Яндекс Трекер».' },
      { status: 422 }
    );
  }

  const tokenResult = await resolveTrackerMetadataToken(orgId, getDecryptedOrganizationTrackerToken);
  if (tokenResult instanceof NextResponse) {
    return tokenResult;
  }

  const apiUrl = resolveTrackerApiBaseUrlForOrganizationRow(org);
  const trackerCloudOrgId = org.tracker_org_id.trim();
  const fingerprint = trackerAdminCatalogConnectionFingerprint(tokenResult, apiUrl, trackerCloudOrgId);
  const api = createAdminTrackerMetadataAxios({
    apiUrl,
    jiraEmail: readIssueTrackerBasicAuthEmail(org.settings),
    orgId: trackerCloudOrgId,
    token: tokenResult,
  });

  try {
    if (resource === 'field-values') {
      const fieldValues = await fetchTrackerMetadataFieldValues(api, searchParams.get('fieldId'));
      if (fieldValues instanceof NextResponse) {
        return fieldValues;
      }
      return NextResponse.json(fieldValues);
    }

    const { fields, statuses } = await loadCachedTrackerOrgMetadata({
      api,
      fingerprint,
      orgId,
      resource,
    });
    return trackerMetadataFieldsStatusesResponse(resource, fields, statuses);
  } catch (error) {
    return handleApiError(error, 'admin tracker metadata', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
