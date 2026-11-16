'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import {
  resolveStatusTransitionTargetKey,
  submitIssueStatusChange,
} from '@/features/sprint/hooks/useTaskOperations/hooks/useTaskStatusOperationsHelpers';
import { usePlannerIntegrationRules } from '@/hooks/usePlannerIntegrationRules';
import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';
import { isTransitionRequiresFieldsError } from '@/lib/issues/transitionRequiresFields';
import { closingTransitionResolution, statusTypeKeyForStatus } from '@/lib/sprints/sprintTaskCompletion';

/**
 * Смена статуса привязанной строки плана (QE7): переход задачи в трекере — тот же, что с карточки спринта.
 * После перехода строка перечитывает статус из трекера. Переход, которому трекер требует заполнить поля,
 * с доски квартала не делается: формы полей здесь нет.
 */
export function useQuarterlyPlanTrackerStatus(refreshTrackerRow: (issueKey: string) => Promise<void>) {
  const { t } = useI18n();
  const { activeOrganizationId } = useProductTenantOrganizations({ pollIntervalMs: 0 });
  const { data: plannerRules } = usePlannerIntegrationRules(activeOrganizationId);

  return useCallback(
    async (issueKey: string, transitionId: string, targetStatusKey?: string, targetStatusDisplay?: string) => {
      try {
        const { finalTargetStatusKey, transitionData } = await resolveStatusTransitionTargetKey(
          issueKey,
          transitionId,
          targetStatusKey
        );
        if (!finalTargetStatusKey) throw new Error(`No target status for transition ${transitionId}`);
        const statusTypeKey =
          transitionData?.to?.statusTypeKey ?? statusTypeKeyForStatus(finalTargetStatusKey, plannerRules?.completion);
        await submitIssueStatusChange({
          // Закрывающему переходу трекер может требовать резолюцию — как при закрытии с карточки спринта (C1).
          resolution:
            statusTypeKey?.toLowerCase() === 'done' ? closingTransitionResolution(plannerRules?.completion) : undefined,
          targetStatusDisplay: targetStatusDisplay ?? transitionData?.to?.display,
          targetStatusKey: finalTargetStatusKey,
          taskId: issueKey,
          trackerIssueKey: issueKey,
          transitionId,
        });
        await refreshTrackerRow(issueKey);
      } catch (error) {
        toast.error(
          t(isTransitionRequiresFieldsError(error) ? 'quarterlyPlan.statusNeedsFields' : 'quarterlyPlan.statusChangeFailed', {
            key: issueKey,
          })
        );
      }
    },
    [plannerRules?.completion, refreshTrackerRow, t]
  );
}
