import type { PlannerIntegrationRulesDto } from '@/lib/trackerIntegration/toPlannerDto';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { applyIntegrationRulesRevisionGateUpdate } from './sprintPlannerIntegrationRulesRevisionGate';

interface UseSprintPlannerIntegrationRulesInvalidationParams {
  activeOrganizationId: string | null | undefined;
  boardIdForPlannerData: number | null;
  plannerIntegrationRules: PlannerIntegrationRulesDto | null | undefined;
  plannerRulesFetched: boolean;
  selectedSprintId: number | null;
}

export function useSprintPlannerIntegrationRulesInvalidation({
  activeOrganizationId,
  boardIdForPlannerData,
  plannerIntegrationRules,
  plannerRulesFetched,
  selectedSprintId,
}: UseSprintPlannerIntegrationRulesInvalidationParams) {
  const queryClient = useQueryClient();
  const integrationRulesRevisionGateRef = useRef<{
    orgId: string | null;
    sprintId: number | null;
    revision: number | undefined;
  } | null>(null);

  useEffect(() => {
    if (!selectedSprintId || !plannerRulesFetched) {
      return;
    }

    const orgId = activeOrganizationId ?? null;
    const rev = plannerIntegrationRules?.configRevision;
    if (rev === undefined) {
      return;
    }

    const prev = integrationRulesRevisionGateRef.current;
    const sameContext =
      prev != null && prev.orgId === orgId && prev.sprintId === selectedSprintId;

    const nextGate = applyIntegrationRulesRevisionGateUpdate({
      activeOrganizationId,
      boardIdForPlannerData,
      orgId,
      plannerIntegrationRules,
      prev,
      queryClient,
      rev,
      selectedSprintId,
      sameContext,
    });
    if (nextGate) {
      integrationRulesRevisionGateRef.current = nextGate;
    }
  }, [
    activeOrganizationId,
    plannerIntegrationRules,
    plannerIntegrationRules?.configRevision,
    plannerRulesFetched,
    queryClient,
    boardIdForPlannerData,
    selectedSprintId,
  ]);
}
