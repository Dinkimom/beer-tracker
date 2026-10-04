'use client';

import { StatusTag } from '@/components/StatusTag';
import { useI18n } from '@/contexts/LanguageContext';
import { translateSprintStatus } from '@/utils/translations';

function mapSprintStatusToTaskStatus(sprintStatus: string): string {
  const statusMap: Record<string, string> = {
    closed: 'closed',
    draft: 'readyfortest',
    in_progress: 'inprogress',
  };
  return statusMap[sprintStatus] || sprintStatus;
}

interface SprintStatusTagProps {
  archived: boolean;
  status: string;
}

/** Тот же тег статуса, что в селекторе спринтов. */
export function SprintStatusTag({ archived, status }: SprintStatusTagProps) {
  const { language, t } = useI18n();

  if (archived) {
    return (
      <span className="shrink-0 whitespace-nowrap rounded-md border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-sm font-medium leading-none text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
        {t('sprint.status.archived')}
      </span>
    );
  }

  if (!status) return null;

  return (
    <StatusTag
      label={translateSprintStatus(status, language)}
      status={mapSprintStatusToTaskStatus(status)}
    />
  );
}
