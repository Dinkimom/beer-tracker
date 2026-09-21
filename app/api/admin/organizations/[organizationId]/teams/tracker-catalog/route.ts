import { NextResponse } from 'next/server';

import { requireAdminOrgTrackerApi } from '@/lib/admin/adminOrgTrackerApiHelpers';
import {
  loadTrackerCatalogResponse,
  trackerCatalogAuthFingerprint,
} from '@/lib/admin/adminTrackerCatalogHelpers';
import { parsePositiveDecimalId } from '@/lib/admin/parsePositiveDecimalId';
import { handleApiError, TRACKER_UPSTREAM_FORWARD_STATUSES } from '@/lib/api-error-handler';
import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';

/**
 * GET /api/admin/organizations/[organizationId]/teams/tracker-catalog
 * Участник организации: очереди и доски из Трекера (серверный токен организации) + привязки команд.
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  const apiResult = await requireAdminOrgTrackerApi(
    request,
    organizationId,
    'Нет сохранённого OAuth-токена трекера. Сохраните токен во вкладке «Яндекс Трекер».'
  );
  if (apiResult instanceof NextResponse) {
    return apiResult;
  }

  try {
    const ensureBoardId = parsePositiveDecimalId(new URL(request.url).searchParams.get('boardId'));
    const issueTracker = await getIssueTrackerProviderClientForOrganization(apiResult.org.id);
    const payload = await loadTrackerCatalogResponse(apiResult.org.id, apiResult.org, issueTracker, {
      authFingerprint: trackerCatalogAuthFingerprint(apiResult.api),
      ensureBoardId: ensureBoardId ?? undefined,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error, 'admin tracker catalog (queues and boards)', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
