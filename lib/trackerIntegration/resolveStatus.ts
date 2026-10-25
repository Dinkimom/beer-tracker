import type { TrackerIntegrationStored } from './schema';
import type { PlannerIntegrationRulesDto } from './toPlannerDto';
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
  statuses: TrackerIntegrationStored['statuses'] | undefined,
  alternateKeys?: readonly string[] | null
): TaskStatus | undefined {
  const fromConfig = resolveStatusCategoryFromIntegration(
    statusKey,
    statusTypeKey,
    statuses,
    alternateKeys
  );
  if (fromConfig) return fromConfig;
  const fromKey = mapStatus(statusKey);
  if (fromKey) return fromKey;
  return statusTypeKey ? mapTrackerStatusTypeKeyToCategory(statusTypeKey) : undefined;
}

/** Категория для отображения (колонка, цвет) по правилам планера — для optimistic-смены статуса. */
export function resolvePlannerStatusCategory(
  statusKey: string,
  statusTypeKey: string | undefined,
  plannerRules: Pick<
    PlannerIntegrationRulesDto,
    'statusDefaultsByTrackerStatusType' | 'statusOverridesByStatusKey'
  > | null | undefined,
  alternateKeys?: readonly string[] | null
): TaskStatus | undefined {
  const statuses = plannerRules
    ? ({
        defaultsByTrackerStatusType: plannerRules.statusDefaultsByTrackerStatusType,
        overridesByStatusKey: plannerRules.statusOverridesByStatusKey,
      } as TrackerIntegrationStored['statuses'])
    : undefined;
  return resolveEffectiveStatusCategory(statusKey, statusTypeKey, statuses, alternateKeys);
}
