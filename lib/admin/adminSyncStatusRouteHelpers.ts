import { NextResponse } from 'next/server';

import { getSyncPlatformEnv } from '@/lib/env';
import { listRedisSyncJobsForOrganization } from '@/lib/sync/listRedisSyncJobsForOrganization';
import { findLatestSyncRunForOrganization, findRunningSyncRunForOrganization } from '@/lib/sync/syncRunsRepository';

import { requireAdminOrganization } from './adminOrgSyncActionHelpers';
import { buildSyncStatusPayload } from './adminSyncStatusHelpers';

export async function getOrganizationSyncStatus(request: Request, organizationId: string) {
  const authResult = await requireAdminOrganization(request, organizationId);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const [running, latest, redisJobs] = await Promise.all([
    findRunningSyncRunForOrganization(authResult.org.id),
    findLatestSyncRunForOrganization(authResult.org.id),
    listRedisSyncJobsForOrganization(authResult.org.id),
  ]);
  const platform = getSyncPlatformEnv();
  return NextResponse.json(
    buildSyncStatusPayload({
      latest,
      org: authResult.org,
      platform,
      redisJobs,
      running,
    })
  );
}
