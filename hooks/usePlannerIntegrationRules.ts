import type { PlannerIntegrationRulesDto } from '@/lib/trackerIntegration/toPlannerDto';

import { useQuery } from '@tanstack/react-query';

import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { fetchPlannerIntegrationRules } from '@/lib/api/plannerIntegrationRules';

/**
 * Публичные правила интеграции трекера для активной организации (пороги, флаги).
 */
export function usePlannerIntegrationRules(organizationId: string | null | undefined) {
  const isDemoPlannerBoards = useDemoPlannerBoardsQueryScope();
  return useQuery<PlannerIntegrationRulesDto>({
    enabled: Boolean(organizationId),
    queryFn: () => fetchPlannerIntegrationRules(organizationId!),
    queryKey: ['planner-integration-rules', organizationId],
    staleTime: 2 * 60 * 1000,
    retry: isDemoPlannerBoards ? false : undefined,
  });
}
