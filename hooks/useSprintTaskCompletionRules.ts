import type { SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';

import { useMemo } from 'react';

import { usePlannerIntegrationRules } from '@/hooks/usePlannerIntegrationRules';
import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';
import { sprintTaskCompletionRulesFromPlanner } from '@/lib/sprints/sprintTaskCompletion';

/**
 * Правила завершения задач активной организации (категории статусов, готовность к релизу) —
 * единый источник «сделано» для свимлейна, бёрндауна, сайдбара и ретро.
 */
export function useSprintTaskCompletionRules(): SprintTaskCompletionRules {
  const { activeOrganizationId } = useProductTenantOrganizations({ pollIntervalMs: 0 });
  const { data: plannerRules } = usePlannerIntegrationRules(activeOrganizationId);
  return useMemo(() => sprintTaskCompletionRulesFromPlanner(plannerRules), [plannerRules]);
}
