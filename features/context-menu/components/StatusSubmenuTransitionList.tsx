'use client';

import type { Task } from '@/types';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { resolveTransitionStatusColorClasses } from '@/features/task/utils/transitionStatusColors';
import { usePlannerIntegrationRules } from '@/hooks/usePlannerIntegrationRules';
import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';
import { type TransitionItem } from '@/lib/beerTrackerApi';

interface StatusSubmenuTransitionListProps {
  isLoading: boolean;
  isLoadingTransitions: boolean;
  pendingTransitionId?: string | null;
  statusTransitions: TransitionItem[];
  task: Task;
  onSelect: (
    transitionId: string,
    targetStatusKey?: string,
    targetStatusDisplay?: string,
    screenId?: string
  ) => void;
}

export function StatusSubmenuTransitionList({
  isLoading,
  isLoadingTransitions,
  pendingTransitionId = null,
  statusTransitions,
  task,
  onSelect,
}: StatusSubmenuTransitionListProps) {
  const { t } = useI18n();
  const { activeOrganizationId } = useProductTenantOrganizations({ pollIntervalMs: 0 });
  const { data: plannerRules } = usePlannerIntegrationRules(activeOrganizationId);
  const statusOverrides = plannerRules?.statusOverridesByStatusKey;

  if (isLoadingTransitions) {
    return (
      <div className="px-4 py-8 flex flex-col items-center justify-center gap-2">
        <Icon className="animate-spin h-6 w-6 text-gray-400" name="spinner" />
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('task.statusSelect.loadingTransitions')}
        </span>
      </div>
    );
  }

  if (statusTransitions.length === 0) {
    return (
      <div className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
        {t('task.statusSelect.noTransitions')}
      </div>
    );
  }

  return (
    <>
      {statusTransitions.map((transition) => {
        const targetStatus = transition.to?.key ?? transition.key ?? '';
        const statusColors = resolveTransitionStatusColorClasses(
          targetStatus,
          transition.to?.statusTypeKey,
          statusOverrides
        );
        const isSelected = targetStatus.toLowerCase() === task.originalStatus?.toLowerCase();
        const selectedRing = isSelected
          ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-blue-400 dark:ring-offset-gray-800'
          : '';
        const isPending = pendingTransitionId === transition.id;

        return (
          <div
            key={transition.id}
            className={`mb-1.5 rounded-md border-2 last:mb-0 ${statusColors.bg} ${statusColors.border} ${selectedRing}`}
          >
            <Button
              className={`flex w-full items-center gap-2 rounded-[inherit] border-0 bg-transparent px-3 py-2 text-left text-sm font-medium shadow-none hover:!bg-black/[0.06] dark:hover:!bg-white/[0.1] ${statusColors.text} ${
                isPending ? '!opacity-100' : ''
              }`}
              disabled={isLoading}
              type="button"
              variant="ghost"
              onClick={() =>
                onSelect(
                  transition.id,
                  transition.to?.key,
                  transition.to?.display,
                  transition.screen?.id
                )
              }
            >
              <span className="min-w-0 flex-1 truncate">
                {transition.to?.display || transition.display}
              </span>
              {isPending ? (
                <Icon
                  className={`h-4 w-4 shrink-0 animate-spin ${statusColors.text}`}
                  name="spinner"
                />
              ) : null}
              {!isPending && isSelected ? (
                <Icon className={`h-4 w-4 shrink-0 ${statusColors.text}`} name="check" />
              ) : null}
            </Button>
          </div>
        );
      })}
    </>
  );
}
