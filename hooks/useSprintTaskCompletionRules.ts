import type { SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';

import { usePlannerIntegrationRules } from '@/hooks/usePlannerIntegrationRules';
import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';

/**
 * Правила «сделано» из трекера (резолюция, справочник типов статусов) — единый источник
 * для свимлейна, бёрндауна, сайдбара и ретро. До загрузки — `null`.
 */
export function useSprintTaskCompletionRules(): SprintTaskCompletionRules | null {
  const { activeOrganizationId } = useProductTenantOrganizations({ pollIntervalMs: 0 });
  const { data: plannerRules } = usePlannerIntegrationRules(activeOrganizationId);
  return plannerRules?.completion ?? null;
}
