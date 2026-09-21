'use client';

import type { SprintListItem } from '@/types/tracker';

import { useDroppable } from '@dnd-kit/core';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { DaysHeaderStatusBadge } from '@/features/sprint/components/DaysHeader/components/DaysHeaderStatusBadge';
import { useTasks } from '@/features/task/hooks/useTasks';
import { formatSprintTotalsPointsLabels, getSprintPointsTotals } from '@/lib/pointsUtils';
import { formatSprintListItemDisplayName } from '@/utils/sprintDisplayName';

import { SprintColumnTasks } from './SprintColumnTasks';

interface SprintColumnProps {
  boardId: number | null;
  sprint: SprintListItem;
}

export function SprintColumn({ sprint, boardId }: SprintColumnProps) {
  const { language, t } = useI18n();
  const dateLocale = language === 'en' ? 'en-US' : 'ru-RU';
  const { setNodeRef, isOver } = useDroppable({
    id: `sprint-column-${sprint.id}`,
  });

  const { data, isLoading, error, refetch } = useTasks(sprint.id, boardId);
  const tasks = data?.tasks || [];
  const developers = data?.developers || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(dateLocale, {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const formatSprintDates = (startDate: string, endDate: string) => {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  // Подсчёт SP и TP через единую точку (lib/pointsUtils)
  const { totalSP, totalTP } = getSprintPointsTotals(tasks);
  const { spLabel, tpLabel } = formatSprintTotalsPointsLabels(totalSP, totalTP);

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[420px] border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col shadow-sm ${
        isOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
    >
      <div className="flex-shrink-0 px-4 py-3.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate min-w-0">
            {formatSprintListItemDisplayName(sprint)}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
            <Icon className="w-3.5 h-3.5" name="calendar" />
            <span>{formatSprintDates(sprint.startDate, sprint.endDate)}</span>
          </div>
          <DaysHeaderStatusBadge archived={sprint.archived} status={sprint.status} />
          {(spLabel || tpLabel) && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 flex-shrink-0">
              {spLabel ? <span>{spLabel}</span> : null}
              {spLabel && tpLabel ? <span>·</span> : null}
              {tpLabel ? <span>{tpLabel}</span> : null}
            </div>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto px-3 py-3">
        <SprintColumnTasks
          developers={developers}
          emptyLabel={t('backlog.sprintColumn.empty')}
          error={error}
          isLoading={isLoading}
          loadErrorTitle={t('backlog.sprintColumn.loadErrorTitle')}
          loadingLabel={t('backlog.sprintColumn.loading')}
          retryLabel={t('backlog.sprintColumn.retry')}
          sprintId={sprint.id}
          tasks={tasks}
          unknownErrorLabel={t('common.unknownError')}
          onRetry={() => refetch()}
        />
      </div>
    </div>
  );
}

