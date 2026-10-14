import { NextResponse } from 'next/server';

import { resolveAdminOrgIssueTracker } from '@/lib/admin/adminOrgTrackerApiHelpers';
import {
  createAdminTrackerMetadataAxios,
  fetchTrackerMetadataFieldValues,
  loadCachedTrackerOrgMetadata,
  parseTrackerMetadataResource,
  resolveTrackerMetadataCredentials,
  trackerAdminCatalogConnectionFingerprint,
  trackerMetadataFieldsStatusesResponse,
} from '@/lib/admin/adminTrackerMetadataRouteHelpers';
import { handleApiError, TRACKER_UPSTREAM_FORWARD_STATUSES } from '@/lib/api-error-handler';
import { requireTenantWithAdminProfile } from '@/lib/api-tenant';
import {
  readIssueTrackerBasicAuthEmail,
  readIssueTrackerCloudId,
} from '@/lib/issueTrackerProvider/settings';
import { findOrganizationById } from '@/lib/organizations';
import { isTrackerAdminCatalogRefreshParam } from '@/lib/trackerApi/trackerAdminCatalogCache';

/**
 * GET /api/admin/organizations/[organizationId]/tracker-metadata?resource=fields|statuses|all|field-values&fieldId=<id>
 * Поля и статусы Tracker/Jira (кэш 30 мин). `refresh=1` — сброс кэша и перезагрузка.
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  const auth = await requireTenantWithAdminProfile(request, organizationId);
  if ('response' in auth) {
    return auth.response;
  }
  const orgId = auth.ctx.organizationId;
  const { searchParams } = new URL(request.url);
  const forceRefresh = isTrackerAdminCatalogRefreshParam(searchParams.get('refresh'));
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

  const credentials = await resolveTrackerMetadataCredentials(orgId);
  if (credentials instanceof NextResponse) {
    return credentials;
  }

  const tracker = resolveAdminOrgIssueTracker(org);
  if (tracker instanceof NextResponse) {
    return tracker;
  }
  const trackerCloudOrgId = org.tracker_org_id.trim();
  const fingerprint = trackerAdminCatalogConnectionFingerprint(
    credentials.accessToken,
    tracker.apiUrl,
    trackerCloudOrgId
  );
  const api = createAdminTrackerMetadataAxios({
    apiUrl: tracker.apiUrl,
    cloudId: readIssueTrackerCloudId(org.settings),
    credentials,
    jiraEmail: readIssueTrackerBasicAuthEmail(org.settings),
    orgId: trackerCloudOrgId,
    providerKind: tracker.kind,
  });

  try {
    if (resource === 'field-values') {
      const fieldValues = await fetchTrackerMetadataFieldValues(
        api,
        tracker.kind,
        searchParams.get('fieldId'),
        { fingerprint, forceRefresh, orgId }
      );
      if (fieldValues instanceof NextResponse) {
        return fieldValues;
      }
      return NextResponse.json(fieldValues);
    }

    const { fields, statuses } = await loadCachedTrackerOrgMetadata({
      api,
      fingerprint,
      forceRefresh,
      kind: tracker.kind,
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
