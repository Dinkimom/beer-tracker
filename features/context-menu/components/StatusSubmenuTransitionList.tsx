'use client';

import type { Task } from '@/types';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { MENU_ROW, MENU_ROW_CHECK } from '@/features/context-menu/contextMenuClasses';
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
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400">
        <Icon className="h-4 w-4 shrink-0 animate-spin" name="spinner" />
        {t('task.statusSelect.loadingTransitions')}
      </div>
    );
  }

  if (statusTransitions.length === 0) {
    return (
      <div className="px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400">
        {t('task.statusSelect.noTransitions')}
      </div>
    );
  }

  return (
    <>
      {statusTransitions.map((transition) => {
        const targetStatus = transition.to?.key ?? transition.key ?? '';
        const statusId = transition.to?.id?.trim();
        const statusColors = resolveTransitionStatusColorClasses(
          targetStatus,
          transition.to?.statusTypeKey,
          statusOverrides,
          statusId && statusId !== targetStatus ? [statusId] : undefined
        );
        const isSelected = targetStatus.toLowerCase() === task.originalStatus?.toLowerCase();
        const isPending = pendingTransitionId === transition.id;

        return (
          <Button
            key={transition.id}
            aria-current={isSelected || undefined}
            className={`${MENU_ROW} ${isPending ? '!opacity-100' : ''}`}
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
            <span className="min-w-0 flex-1">
              <span
                className={`inline-block max-w-full truncate rounded border px-1.5 text-xs font-medium leading-5 ${statusColors.bg} ${statusColors.border} ${statusColors.text}`}
              >
                {transition.to?.display || transition.display}
              </span>
            </span>
            {isPending ? (
              <Icon className="h-4 w-4 shrink-0 animate-spin text-gray-400" name="spinner" />
            ) : null}
            {!isPending && isSelected ? <Icon className={MENU_ROW_CHECK} name="check" /> : null}
          </Button>
        );
      })}
    </>
  );
}
