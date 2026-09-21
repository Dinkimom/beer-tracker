import type { AdminSyncStatusPayload } from '@/lib/api/admin/types';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

import { adminOrgApiPath } from './paths';

export async function fetchAdminSyncStatus(orgId: string): Promise<AdminSyncStatusPayload> {
  const { data } = await getPlannerBeerTrackerApi().get<AdminSyncStatusPayload>(
    adminOrgApiPath(orgId, 'sync/status')
  );
  return data;
}

export async function postAdminIncrementalSync(
  orgId: string
): Promise<{ jobId?: string }> {
  const { data } = await getPlannerBeerTrackerApi().post<{ jobId?: string }>(
    adminOrgApiPath(orgId, 'sync/incremental')
  );
  return data;
}

export async function postAdminFullRescanSync(
  orgId: string
): Promise<{ jobId?: string; retryAfterSeconds?: number }> {
  const { data } = await getPlannerBeerTrackerApi().post<{
    jobId?: string;
    retryAfterSeconds?: number;
  }>(adminOrgApiPath(orgId, 'sync/full-rescan'), { confirm: true });
  return data;
}

export async function patchAdminSyncSettings(
  orgId: string,
  body: Record<string, unknown>
): Promise<void> {
  await getPlannerBeerTrackerApi().patch(adminOrgApiPath(orgId, 'sync/settings'), body);
}
