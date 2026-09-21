import type { SyncTickResultBody } from './handleSyncTick';
import type { SyncPlatformEnv } from '@/lib/env';

import { updateOrganization, listOrganizationsDueForIncrementalSync } from '@/lib/organizations';
import { parseResolveAndValidateOrgSyncFromSettingsRoot } from '@/lib/orgSyncSettings';

import { enqueueIncrementalSync } from './queue';

type DueOrg = Awaited<ReturnType<typeof listOrganizationsDueForIncrementalSync>>[number];

async function enqueueDueOrganizationIncrementalSync(
  org: DueOrg,
  platform: SyncPlatformEnv
): Promise<{ enqueued: boolean; skippedInvalidSettings: boolean }> {
  const v = parseResolveAndValidateOrgSyncFromSettingsRoot(org.settings, platform);
  if (!v.ok) {
    return { enqueued: false, skippedInvalidSettings: true };
  }
  if (!v.settings.enabled) {
    return { enqueued: false, skippedInvalidSettings: false };
  }

  await enqueueIncrementalSync(org.id);
  const nextRun = new Date(Date.now() + v.settings.intervalMinutes * 60_000);
  await updateOrganization(org.id, { sync_next_run_at: nextRun });
  return { enqueued: true, skippedInvalidSettings: false };
}

export async function collectDueOrganizationIncrementalSyncs(
  candidates: DueOrg[],
  platform: SyncPlatformEnv
): Promise<{ organizationIds: string[]; skippedInvalidSettings: number }> {
  const organizationIds: string[] = [];
  let skippedInvalidSettings = 0;

  for (const org of candidates) {
    const result = await enqueueDueOrganizationIncrementalSync(org, platform);
    if (result.skippedInvalidSettings) {
      skippedInvalidSettings += 1;
      continue;
    }
    if (result.enqueued) {
      organizationIds.push(org.id);
    }
  }

  return { organizationIds, skippedInvalidSettings };
}

export function buildSyncTickResultBody(
  organizationIds: string[],
  skippedInvalidSettings: number
): SyncTickResultBody {
  return {
    enqueued: organizationIds.length,
    organizationIds,
    ...(skippedInvalidSettings > 0 ? { skippedInvalidSettings } : {}),
  };
}
