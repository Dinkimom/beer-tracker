import type { TrackerIntegrationStored } from './schema';
import type { Team } from '@/types';
import type { TrackerIssue } from '@/types/tracker';

import { readIssueTagTokens, readStringTokenFromIssue } from './issueFieldUtils';

function normalizeMapKey(s: string): string {
  return s.trim().toLowerCase();
}

function resolvePlatformFromFieldMap(
  issue: TrackerIssue,
  platform: NonNullable<TrackerIntegrationStored['platform']>
): Team | undefined {
  const raw = readStringTokenFromIssue(issue, platform.fieldId ?? 'functionalTeam');
  if (!raw) {
    return platform.fallbackPlatform;
  }
  const key = normalizeMapKey(raw);
  for (const row of platform.valueMap) {
    if (normalizeMapKey(row.trackerValue) === key) {
      return row.platform;
    }
  }
  return platform.fallbackPlatform;
}

function resolvePlatformFromTagMap(
  issue: TrackerIssue,
  platform: NonNullable<TrackerIntegrationStored['platform']>
): Team | undefined {
  const tagSet = new Set(readIssueTagTokens(issue));
  for (const row of platform.valueMap) {
    if (tagSet.has(normalizeMapKey(row.trackerValue))) {
      return row.platform;
    }
  }
  return platform.fallbackPlatform;
}

export function resolvePlatformFromIntegration(
  issue: TrackerIssue,
  platform: TrackerIntegrationStored['platform']
): Team | undefined {
  if (!platform?.valueMap?.length) {
    return undefined;
  }
  if (platform.source === 'field') {
    return resolvePlatformFromFieldMap(issue, platform);
  }
  return resolvePlatformFromTagMap(issue, platform);
}
