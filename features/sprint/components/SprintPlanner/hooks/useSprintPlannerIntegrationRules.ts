import type { PlannerIntegrationRulesDto } from '@/lib/trackerIntegration/toPlannerDto';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { usePlannerIntegrationRules } from '@/hooks/usePlannerIntegrationRules';
import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';

import { applyIntegrationRulesRevisionGateUpdate } from './sprintPlannerIntegrationRulesRevisionGate';

interface UseSprintPlannerIntegrationRulesParams {
  boardIdForPlannerData: number | null;
  /** Демо-планер берёт правила фикстурной организации, а не текущей. */
  demoPlannerRulesOrganizationId?: string;
  selectedSprintId: number | null;
}

/**
 * Правила интеграции трекера для доски: организация, запрос правил и сброс кэша спринта,
 * когда ревизия правил сменилась.
 */
export function useSprintPlannerIntegrationRules({
  boardIdForPlannerData,
  demoPlannerRulesOrganizationId,
  selectedSprintId,
}: UseSprintPlannerIntegrationRulesParams): PlannerIntegrationRulesDto | null | undefined {
  const { activeOrganizationId: tenantOrganizationId } = useProductTenantOrganizations({
    pollIntervalMs: 0,
  });
  const activeOrganizationId = demoPlannerRulesOrganizationId ?? tenantOrganizationId;
  const { data: plannerIntegrationRules, isFetched: plannerRulesFetched } =
    usePlannerIntegrationRules(activeOrganizationId);
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

  return plannerIntegrationRules;
}
