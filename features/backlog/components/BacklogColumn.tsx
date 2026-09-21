'use client';

import type { Developer, Task } from '@/types';

import { useDroppable } from '@dnd-kit/core';

import { useI18n } from '@/contexts/LanguageContext';
import { formatSprintTotalsPointsLabels, getSprintPointsTotals } from '@/lib/pointsUtils';

import { BacklogColumnTaskList } from './BacklogColumnTaskList';

interface BacklogColumnProps {
  developers: Developer[];
  loading: boolean;
  tasks: Task[];
}

export function BacklogColumn({ developers, loading, tasks }: BacklogColumnProps) {
  const { t } = useI18n();
  const { setNodeRef, isOver } = useDroppable({
    id: 'backlog-column',
  });

  const { totalSP, totalTP } = getSprintPointsTotals(tasks);
  const { spLabel, tpLabel } = formatSprintTotalsPointsLabels(totalSP, totalTP);

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col shadow-sm ${
        isOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
    >
      <div className="flex-shrink-0 px-4 py-3.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('backlog.column.title')}</h2>
          {!loading && (spLabel || tpLabel) && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300">
              {spLabel ? <span>{spLabel}</span> : null}
              {spLabel && tpLabel ? <span>·</span> : null}
              {tpLabel ? <span>{tpLabel}</span> : null}
            </div>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto px-3 py-3">
        <BacklogColumnTaskList developers={developers} loading={loading} tasks={tasks} />
      </div>
    </div>
  );
}

