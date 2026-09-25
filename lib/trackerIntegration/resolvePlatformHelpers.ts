import type { TrackerIntegrationStored } from './schema';
import type { Team } from '@/types';
import type { TrackerIssue } from '@/types/tracker';

import { readIssueTagTokens, readStringTokensFromIssue } from './issueFieldUtils';

function normalizeMapKey(s: string): string {
  return s.trim().toLowerCase();
}

function resolvePlatformFromFieldMap(
  issue: TrackerIssue,
  platform: NonNullable<TrackerIntegrationStored['platform']>
): Team | undefined {
  const tokens = readStringTokensFromIssue(issue, platform.fieldId ?? 'functionalTeam')
    .map(normalizeMapKey)
    .filter(Boolean);
  if (tokens.length === 0) {
    return platform.fallbackPlatform;
  }
  for (const row of platform.valueMap) {
    if (tokens.includes(normalizeMapKey(row.trackerValue))) {
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
