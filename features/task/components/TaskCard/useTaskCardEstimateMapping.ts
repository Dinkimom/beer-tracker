'use client';

import type { TaskCardEstimateMapping } from './taskCardEstimateVisibility';

import { usePlannerIntegrationRules } from '@/hooks/usePlannerIntegrationRules';
import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';

const UNMAPPED_ESTIMATE_FIELDS: TaskCardEstimateMapping = {
  devMapped: false,
  qaMapped: false,
};

/** Маппинг полей оценок из админки. Пока правила не пришли, оценки на карточках скрыты. */
export function useTaskCardEstimateMapping(): TaskCardEstimateMapping {
  const { activeOrganizationId } = useProductTenantOrganizations({ pollIntervalMs: 0 });
  const { data } = usePlannerIntegrationRules(activeOrganizationId);
  if (!data?.estimateFields) {
    return UNMAPPED_ESTIMATE_FIELDS;
  }
  return {
    devMapped: data.estimateFields.devMapped === true,
    qaMapped: data.estimateFields.qaMapped === true,
  };
}
