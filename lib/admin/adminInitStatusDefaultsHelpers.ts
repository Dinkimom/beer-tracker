import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { updateOrganization } from '@/lib/organizations';
import {
  extractTrackerIntegrationJson,
  mergeOrganizationSettingsTrackerIntegration,
  parseTrackerIntegrationStored,
  type TrackerIntegrationStored,
} from '@/lib/trackerIntegration';
import { fetchTrackerOrganizationStatuses } from '@/lib/trackerIntegration/fetchTrackerOrgMetadata';
import { buildStatusDefaultsFromTrackerStatuses } from '@/lib/trackerIntegration/statusTypeDefaults';

import { requireAdminOrgTrackerApi } from './adminOrgTrackerApiHelpers';

function emptyStored(revision: number): TrackerIntegrationStored {
  return { configRevision: revision };
}

function mergeStatusDefaults(
  orgSettings: unknown,
  trackerStatuses: Awaited<ReturnType<typeof fetchTrackerOrganizationStatuses>>
) {
  const built = buildStatusDefaultsFromTrackerStatuses(trackerStatuses);
  const prev = parseTrackerIntegrationStored(extractTrackerIntegrationJson(orgSettings));
  const base = prev ?? emptyStored(0);
  const mergedDefaults = {
    ...built,
    ...(base.statuses?.defaultsByTrackerStatusType ?? {}),
  };
  const nextRevision = (base.configRevision ?? 0) + 1;
  const stored: TrackerIntegrationStored = {
    ...base,
    configRevision: nextRevision,
    statuses: {
      ...base.statuses,
      defaultsByTrackerStatusType: mergedDefaults,
      lastMetadataFetchedAt: new Date().toISOString(),
    },
  };
  return { built, stored, trackerStatusCount: trackerStatuses.length };
}

export async function initTrackerStatusDefaults(
  request: Request,
  organizationId: string
): Promise<NextResponse> {
  const apiResult = await requireAdminOrgTrackerApi(
    request,
    organizationId,
    'Нет сохранённого OAuth-токена трекера. Сохраните токен во вкладке «Яндекс Трекер», затем повторите запрос.'
  );
  if (apiResult instanceof NextResponse) {
    return apiResult;
  }

  try {
    const trackerStatuses = await fetchTrackerOrganizationStatuses(apiResult.api);
    const { built, stored, trackerStatusCount } = mergeStatusDefaults(
      apiResult.org.settings,
      trackerStatuses
    );
    const newSettings = mergeOrganizationSettingsTrackerIntegration(apiResult.org.settings, stored);
    const updated = await updateOrganization(apiResult.org.id, { settings: newSettings });
    if (!updated) {
      return NextResponse.json({ error: 'Не удалось сохранить' }, { status: 500 });
    }
    return NextResponse.json({
      config: stored,
      ok: true,
      seededKeys: Object.keys(built),
      trackerStatusCount,
    });
  } catch (error) {
    return handleApiError(error, 'init tracker status defaults');
  }
}
