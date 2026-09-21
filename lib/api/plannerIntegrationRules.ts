import type { PlannerIntegrationRulesDto } from '@/lib/trackerIntegration/toPlannerDto';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

export async function fetchPlannerIntegrationRules(
  organizationId: string
): Promise<PlannerIntegrationRulesDto> {
  const api = getPlannerBeerTrackerApi();
  const base = (api.defaults.baseURL ?? '').replace(/\/$/, '');
  const path =
    base === '/api/demo'
      ? '/planner-integration-rules'
      : `/organizations/${organizationId}/planner-integration-rules`;
  const { data } = await api.get<PlannerIntegrationRulesDto>(path);
  return data;
}
