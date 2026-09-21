import type { TrackerIntegrationStored } from './schema';
import type { TaskStatus } from '@/utils/statusMapper';

import { mapStatus } from '@/utils/statusMapper';

import { resolveStatusCategoryFromIntegration } from './resolveStatusHelpers';
import { mapTrackerStatusTypeKeyToCategory } from './statusTypeDefaults';

export { resolveStatusCategoryFromIntegration };

/**
 * Итоговая категория: настройки интеграции → mapStatus(ключ) → эвристика по типу статуса.
 */
export function resolveEffectiveStatusCategory(
  statusKey: string,
  statusTypeKey: string | undefined,
  statuses: TrackerIntegrationStored['statuses'] | undefined
): TaskStatus | undefined {
  const fromConfig = resolveStatusCategoryFromIntegration(statusKey, statusTypeKey, statuses);
  if (fromConfig) return fromConfig;
  const fromKey = mapStatus(statusKey);
  if (fromKey) return fromKey;
  return statusTypeKey ? mapTrackerStatusTypeKeyToCategory(statusTypeKey) : undefined;
}
