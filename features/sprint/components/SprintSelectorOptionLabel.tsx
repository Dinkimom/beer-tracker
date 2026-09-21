'use client';

import type { SprintListItem } from '@/types/tracker';

import { StatusTag } from '@/components/StatusTag';
import { useI18n } from '@/contexts/LanguageContext';
import { formatSprintListItemDisplayName } from '@/utils/sprintDisplayName';
import { translateSprintStatus } from '@/utils/translations';

function mapSprintStatusToTaskStatus(sprintStatus: string): string {
  const statusMap: Record<string, string> = {
    in_progress: 'inprogress',
    closed: 'closed',
    draft: 'readyfortest',
  };
  return statusMap[sprintStatus] || sprintStatus;
}

interface SprintSelectorOptionLabelProps {
  dateClassName: string;
  sprint: SprintListItem;
  titleClassName: string;
  formatDate: (dateString: string) => string;
}

/** Одна строка спринта: имя + даты + статус (без переноса). */
export function SprintSelectorOptionLabel({
  dateClassName,
  formatDate,
  sprint,
  titleClassName,
}: SprintSelectorOptionLabelProps) {
  const { language, t } = useI18n();

  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className={`shrink-0 text-sm font-semibold ${titleClassName}`}>
        {formatSprintListItemDisplayName(sprint)}
      </span>
      {sprint.startDate && sprint.endDate ? (
        <span className={`shrink-0 text-sm ${dateClassName}`}>
          {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
        </span>
      ) : null}
      {!sprint.archived && sprint.status ? (
        <StatusTag
          label={translateSprintStatus(sprint.status, language)}
          status={mapSprintStatusToTaskStatus(sprint.status)}
        />
      ) : null}
      {sprint.archived ? (
        <span className="shrink-0 whitespace-nowrap rounded-md border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-sm font-medium leading-none text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {t('sprint.status.archived')}
        </span>
      ) : null}
    </span>
  );
}
