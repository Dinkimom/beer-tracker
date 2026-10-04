'use client';

import type { SprintListItem } from '@/types/tracker';

import { useState } from 'react';

import { useI18n } from '@/contexts/LanguageContext';

import { ArchivedSprintItem } from './ArchivedSprintItem';
import { BacklogSectionFrame } from './BacklogSectionFrame';

interface ArchivedSprintsListProps {
  sprints: SprintListItem[];
}

export function ArchivedSprintsList({ sprints }: ArchivedSprintsListProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [expandedSprintId, setExpandedSprintId] = useState<number | null>(null);

  const handleSprintClick = (sprintId: number) => {
    setExpandedSprintId(expandedSprintId === sprintId ? null : sprintId);
  };

  return (
    <BacklogSectionFrame
      countLabel={String(sprints.length)}
      expanded={expanded}
      title={t('backlog.archived.title')}
      onToggle={() => setExpanded((open) => !open)}
    >
      {sprints.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {t('backlog.archived.empty')}
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
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
    </BacklogSectionFrame>
  );
}
