import type { TrackerIntegrationStored } from './schema';
import type { TaskStatus } from '@/utils/statusMapper';

import { isTaskStatus } from './schema';

function readOverrideCategory(
  overrides: NonNullable<TrackerIntegrationStored['statuses']>['overridesByStatusKey'],
  key: string
): TaskStatus | undefined {
  const c = overrides?.[key]?.category;
  return c !== undefined && isTaskStatus(c) ? c : undefined;
}

function resolveOverrideStatusCategory(
  statusKey: string | undefined,
  statuses: NonNullable<TrackerIntegrationStored['statuses']>,
  alternateKeys?: readonly string[] | null
): TaskStatus | undefined {
  const overrides = statuses.overridesByStatusKey;
  if (!overrides) {
    return undefined;
  }
  for (const alt of alternateKeys ?? []) {
    const key = alt.trim();
    if (!key) {
      continue;
    }
    const fromAlt = readOverrideCategory(overrides, key);
    if (fromAlt) {
      return fromAlt;
    }
  }
  const sk = statusKey?.trim();
  if (sk) {
    const direct = readOverrideCategory(overrides, sk);
    if (direct) {
      return direct;
    }
  }
  return undefined;
}

function resolveDefaultStatusCategory(
  statusTypeKey: string | undefined,
  statuses: NonNullable<TrackerIntegrationStored['statuses']>
): TaskStatus | undefined {
  const tk = statusTypeKey?.trim();
  if (!tk || !statuses.defaultsByTrackerStatusType?.[tk]) {
    return undefined;
  }
  const c = statuses.defaultsByTrackerStatusType[tk];
  return isTaskStatus(c) ? c : undefined;
}

export function resolveStatusCategoryFromIntegration(
  statusKey: string | undefined,
  statusTypeKey: string | undefined,
  statuses: TrackerIntegrationStored['statuses'],
  alternateKeys?: readonly string[] | null
): TaskStatus | undefined {
  if (!statuses) {
    return undefined;
  }
  return (
    resolveOverrideStatusCategory(statusKey, statuses, alternateKeys) ??
    resolveDefaultStatusCategory(statusTypeKey, statuses)
  );
}
