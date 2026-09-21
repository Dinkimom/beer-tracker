'use client';

import type { SprintListItem } from '@/types/tracker';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

import { SprintSelectorOptionLabel } from './SprintSelectorOptionLabel';

interface SprintSelectorTriggerContentProps {
  selectedSprint: SprintListItem | undefined;
  sprintsLength: number;
  sprintsLoading: boolean;
  formatDate: (dateString: string) => string;
}

export function SprintSelectorTriggerContent({
  formatDate,
  selectedSprint,
  sprintsLoading,
  sprintsLength,
}: SprintSelectorTriggerContentProps) {
  const { t } = useI18n();

  if (sprintsLoading) {
    return (
      <div className="flex items-center gap-1.5">
        <Icon className="h-4 w-4 shrink-0 animate-spin text-gray-400 dark:text-gray-500" name="spinner" />
        <span className="text-sm text-gray-500 dark:text-gray-400">{t('sprint.selector.loading')}</span>
      </div>
    );
  }

  if (sprintsLength === 0) {
    return (
      <span className="text-sm text-gray-500 dark:text-gray-400">{t('sprint.selector.empty')}</span>
    );
  }

  if (!selectedSprint) {
    return (
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {t('sprint.selector.placeholder')}
      </span>
    );
  }

  return (
    <SprintSelectorOptionLabel
      dateClassName="text-gray-600 dark:text-gray-400"
      formatDate={formatDate}
      sprint={selectedSprint}
      titleClassName="text-gray-900 dark:text-gray-100"
    />
  );
}
