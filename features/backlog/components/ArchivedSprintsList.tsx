'use client';

import type { SprintListItem } from '@/types/tracker';

import { useState } from 'react';

import { useI18n } from '@/contexts/LanguageContext';

import { ArchivedSprintItem } from './ArchivedSprintItem';

interface ArchivedSprintsListProps {
  sprints: SprintListItem[];
}

export function ArchivedSprintsList({ sprints }: ArchivedSprintsListProps) {
  const { t } = useI18n();
  const [expandedSprintId, setExpandedSprintId] = useState<number | null>(null);

  const handleSprintClick = (sprintId: number) => {
    setExpandedSprintId(expandedSprintId === sprintId ? null : sprintId);
  };

  return (
    <div className="flex-shrink-0 w-[420px] h-full border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col shadow-sm">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('backlog.archived.title')}</h2>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        {sprints.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('backlog.archived.empty')}
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {sprints.map((sprint) => (
              <ArchivedSprintItem
                key={sprint.id}
                expanded={expandedSprintId === sprint.id}
                sprint={sprint}
                onClick={() => handleSprintClick(sprint.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

