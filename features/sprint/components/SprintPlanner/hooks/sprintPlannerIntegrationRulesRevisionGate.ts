import type { PlannerIntegrationRulesDto } from '@/lib/trackerIntegration/toPlannerDto';
import type { QueryClient } from '@tanstack/react-query';


function invalidateSprintTasksQueries(
  queryClient: QueryClient,
  selectedSprintId: number,
  boardIdForPlannerData: number | null
) {
  queryClient.invalidateQueries({
    queryKey: ['tasks', selectedSprintId, boardIdForPlannerData ?? null],
  });
}

function shouldInvalidateOnOrgChange(
  prev: { orgId: string | null; sprintId: number | null } | null,
  orgId: string | null,
  selectedSprintId: number
): boolean {
  return (
    prev != null &&
    prev.sprintId === selectedSprintId &&
    prev.orgId !== orgId &&
    orgId != null &&
    prev.orgId != null
  );
}

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
