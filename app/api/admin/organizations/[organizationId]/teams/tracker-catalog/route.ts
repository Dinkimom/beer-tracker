import { NextResponse } from 'next/server';

import { requireAdminOrgTrackerApi } from '@/lib/admin/adminOrgTrackerApiHelpers';
import {
  loadTrackerCatalogResponse,
  trackerCatalogAuthFingerprint,
} from '@/lib/admin/adminTrackerCatalogHelpers';
import { parsePositiveDecimalId } from '@/lib/admin/parsePositiveDecimalId';
import { handleApiError, TRACKER_UPSTREAM_FORWARD_STATUSES } from '@/lib/api-error-handler';
import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import { isTrackerAdminCatalogRefreshParam } from '@/lib/trackerApi/trackerAdminCatalogCache';

/**
 * GET /api/admin/organizations/[organizationId]/teams/tracker-catalog
 * Участник организации: очереди/проекты и доски из Трекера (кэш 30 мин) + привязки команд.
 * `refresh=1` — сброс кэша и перезагрузка из трекера.
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
    const searchParams = new URL(request.url).searchParams;
    const ensureBoardId = parsePositiveDecimalId(searchParams.get('boardId'));
    const forceRefresh = isTrackerAdminCatalogRefreshParam(searchParams.get('refresh'));
    const issueTracker = await getIssueTrackerProviderClientForOrganization(apiResult.org.id);
    const payload = await loadTrackerCatalogResponse(apiResult.org.id, apiResult.org, issueTracker, {
      authFingerprint: trackerCatalogAuthFingerprint(apiResult.api),
      ensureBoardId: ensureBoardId ?? undefined,
      forceRefresh,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error, 'admin tracker catalog (queues and boards)', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
