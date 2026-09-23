'use client';

import type { Task } from '@/types';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { resolveTransitionStatusColorClasses } from '@/features/task/utils/transitionStatusColors';
import { usePlannerIntegrationRules } from '@/hooks/usePlannerIntegrationRules';
import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';
import { type TransitionItem } from '@/lib/beerTrackerApi';

interface TaskStatusSelectTransitionListProps {
  isLoading: boolean;
  loadingLabel: string;
  noTransitionsLabel: string;
  task: Pick<Task, 'id' | 'name' | 'originalStatus' | 'originalTaskId' | 'statusColorKey' | 'type'>;
  transitions: TransitionItem[];
  onSelect: (
    transitionId: string,
    targetStatusKey?: string,
    targetStatusDisplay?: string,
    screenId?: string
  ) => void;
}

export function TaskStatusSelectTransitionList({
  isLoading,
  loadingLabel,
  noTransitionsLabel,
  onSelect,
  task,
  transitions,
}: TaskStatusSelectTransitionListProps) {
  const { activeOrganizationId } = useProductTenantOrganizations({ pollIntervalMs: 0 });
  const { data: plannerRules } = usePlannerIntegrationRules(activeOrganizationId);
  const statusOverrides = plannerRules?.statusOverridesByStatusKey;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-6">
        <Icon className="h-5 w-5 animate-spin text-gray-400" name="spinner" />
        <span className="text-xs text-gray-500 dark:text-gray-400">{loadingLabel}</span>
      </div>
    );
  }

  if (transitions.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
        {noTransitionsLabel}
      </div>
    );
  }

  return (
    <>
      {transitions.map((transition) => {
        const targetStatus = transition.to?.key ?? transition.key ?? '';
        const statusId = transition.to?.id?.trim();
        const statusColors = resolveTransitionStatusColorClasses(
          targetStatus,
          transition.to?.statusTypeKey,
          statusOverrides,
          statusId && statusId !== targetStatus ? [statusId] : undefined
        );
        const isSelected = targetStatus.toLowerCase() === task.originalStatus?.toLowerCase();

        return (
          <Button
            key={transition.id}
            className={`mb-1 flex w-full min-w-0 items-center gap-2 rounded-md border-2 px-2 py-1 text-left text-xs shadow-none last:mb-0 ${statusColors.bg} ${statusColors.border} ${
              isSelected
                ? `${statusColors.text} font-medium ring-2 ring-blue-500 ring-offset-1 dark:ring-blue-400 dark:ring-offset-gray-800`
                : `${statusColors.text} hover:opacity-90`
            }`}
            type="button"
            variant="ghost"
            onClick={() =>
              onSelect(
                transition.id,
                transition.to?.key,
                transition.to?.display ?? transition.display,
                transition.screen?.id
              )
            }
          >
            <span
              className="min-w-0 flex-1 truncate font-medium"
              title={transition.to?.display ?? transition.display}
            >
              {transition.to?.display ?? transition.display}
            </span>
            {isSelected ? (
              <Icon className={`h-3.5 w-3.5 shrink-0 ${statusColors.text}`} name="check" />
            ) : null}
          </Button>
        );
      })}
    </>
  );
}
