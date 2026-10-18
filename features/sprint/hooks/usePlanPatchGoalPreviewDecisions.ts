'use client';

import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';
import type { PlanPatchGoalPreview } from '@/lib/sprints/sprintPlanPatchGoalPreview';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useSprintGoals } from '@/features/sprint/hooks/useSprintGoals';
import {
  approvePlanPatchGoalPreview,
  rejectPlanPatchGoalPreview,
} from '@/lib/api/planPatchGoalPreviews';

export function usePlanPatchGoalPreviewDecisions(sprintId: number | null): {
  approve: (goalId?: string) => Promise<void>;
  clientBrand?: McpOAuthClientBrand;
  count: number;
  previews: PlanPatchGoalPreview[];
  reject: (goalId?: string) => Promise<void>;
} {
  const queryClient = useQueryClient();
  const delivery = useSprintGoals(sprintId, 'delivery');
  const discovery = useSprintGoals(sprintId, 'discovery');
  const previews = [
    ...(delivery.data?.goalPreviews ?? []),
    ...(discovery.data?.goalPreviews ?? []),
  ];
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['sprintGoals'] }),
    [queryClient]
  );
  const approve = useCallback(
    async (goalId?: string) => {
      if (sprintId == null) {
        return;
      }
      const ok = await approvePlanPatchGoalPreview(sprintId, goalId);
      if (ok) {
        await refresh();
      }
    },
    [refresh, sprintId]
  );
  const reject = useCallback(
    async (goalId?: string) => {
      if (sprintId == null) {
        return;
      }
      const ok = await rejectPlanPatchGoalPreview(sprintId, goalId);
      if (ok) {
        await refresh();
      }
    },
    [refresh, sprintId]
  );
  return {
    approve,
    clientBrand: previews[0]?.clientBrand,
    count: previews.length,
    previews,
    reject,
  };
}
