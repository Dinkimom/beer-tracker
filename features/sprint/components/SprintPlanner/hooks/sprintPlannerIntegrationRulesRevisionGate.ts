import type { PlannerIntegrationRulesDto } from '@/lib/trackerIntegration/toPlannerDto';
import type { QueryClient } from '@tanstack/react-query';

import {
  invalidateSprintTasksQueries,
  shouldInvalidateOnOrgChange,
} from './sprintPlannerIntegrationRulesInvalidationHelpers';

export function applyIntegrationRulesRevisionGateUpdate(params: {
  activeOrganizationId: string | null | undefined;
  boardIdForPlannerData: number | null;
  orgId: string | null;
  plannerIntegrationRules: PlannerIntegrationRulesDto | null | undefined;
  prev: { orgId: string | null; sprintId: number | null; revision: number | undefined } | null;
  queryClient: QueryClient;
  rev: number;
  selectedSprintId: number;
  sameContext: boolean;
}): { orgId: string | null; sprintId: number | null; revision: number } | null {
  const {
    boardIdForPlannerData,
    orgId,
    prev,
    queryClient,
    rev,
    selectedSprintId,
    sameContext,
  } = params;

  if (!sameContext) {
    if (shouldInvalidateOnOrgChange(prev, orgId, selectedSprintId)) {
      invalidateSprintTasksQueries(queryClient, selectedSprintId, boardIdForPlannerData);
    }
    return { orgId, sprintId: selectedSprintId, revision: rev };
  }

  if (prev?.revision === rev) {
    return null;
  }

  invalidateSprintTasksQueries(queryClient, selectedSprintId, boardIdForPlannerData);
  return { orgId, sprintId: selectedSprintId, revision: rev };
}
