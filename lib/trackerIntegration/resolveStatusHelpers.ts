import type { TrackerIntegrationStored } from './schema';
import type { TaskStatus } from '@/utils/statusMapper';

import { isTaskStatus } from './schema';

function resolveOverrideStatusCategory(
  statusKey: string | undefined,
  statuses: NonNullable<TrackerIntegrationStored['statuses']>
): TaskStatus | undefined {
  const sk = statusKey?.trim();
  if (!sk || !statuses.overridesByStatusKey?.[sk]) {
    return undefined;
  }
  const c = statuses.overridesByStatusKey[sk].category;
  return c !== undefined && isTaskStatus(c) ? c : undefined;
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
  statuses: TrackerIntegrationStored['statuses']
): TaskStatus | undefined {
  if (!statuses) {
    return undefined;
  }
  return (
    resolveOverrideStatusCategory(statusKey, statuses) ??
    resolveDefaultStatusCategory(statusTypeKey, statuses)
  );
}
