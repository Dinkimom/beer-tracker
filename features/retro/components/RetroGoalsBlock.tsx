'use client';

import { useQueryClient } from '@tanstack/react-query';

import { useI18n } from '@/contexts/LanguageContext';
import { GoalItem } from '@/features/sidebar/components/GoalItem';
import { useSprintGoalManagement } from '@/features/sprint/hooks/useSprintGoalManagement';
import { useSprintGoals } from '@/features/sprint/hooks/useSprintGoals';

/** Цели спринта в сайдбаре ретро: только отметка «выполнено», без правки текста. */
export function RetroGoalsBlock({ boardId, sprintId }: { boardId: number; sprintId: number }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const delivery = useSprintGoals(sprintId, 'delivery');
  const discovery = useSprintGoals(sprintId, 'discovery');
  const deliveryManagement = useSprintGoalManagement({ boardId, goalType: 'delivery', queryClient, sprintId });
  const discoveryManagement = useSprintGoalManagement({ boardId, goalType: 'discovery', queryClient, sprintId });

  const groups = [
    {
      heading: t('sidebar.goalsTab.deliveryGoalsHeading'),
      items: delivery.data?.checklistItems ?? [],
      key: 'delivery',
      management: deliveryManagement,
    },
    {
      heading: t('sidebar.goalsTab.discoveryGoalsHeading'),
      items: discovery.data?.checklistItems ?? [],
      key: 'discovery',
      management: discoveryManagement,
    },
  ].filter((group) => group.items.length > 0);
  const loading = delivery.isLoading || discovery.isLoading;
  const loadError = delivery.isError || discovery.isError;

  return (
    <div className="border-b border-gray-200 px-4 pt-4 pb-3 dark:border-gray-700">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {t('retro.goals.heading')}
      </h2>
      {loading ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">{t('retro.goals.loading')}</p>
      ) : null}
      {!loading && loadError ? (
        <p className="text-sm text-red-500 dark:text-red-400">{t('retro.goals.loadError')}</p>
      ) : null}
      {!loading && !loadError && groups.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">{t('retro.goals.empty')}</p>
      ) : null}
      {groups.map((group) => (
        <div key={group.key} className="mt-2 first:mt-0">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
            <span>{group.heading}</span>
            <span className="tabular-nums text-gray-500 dark:text-gray-400">
              {group.items.filter((item) => item.checked).length}/{group.items.length}
            </span>
          </div>
          <div className="space-y-0.5">
            {group.items.map((item, index) => (
              <GoalItem
                key={item.id}
                index={index + 1}
                isUpdating={group.management.updatingItems.has(item.id)}
                item={item}
                onCheckboxChange={(checked) => {
                  group.management.handleCheckboxChange(item.id, checked).catch(() => undefined);
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
