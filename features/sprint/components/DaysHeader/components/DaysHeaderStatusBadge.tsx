/**
 * Компонент бейджа статуса спринта
 */

'use client';

import { useI18n } from '@/contexts/LanguageContext';
import { translateSprintStatus } from '@/utils/translations';

interface DaysHeaderStatusBadgeProps {
  archived: boolean;
  status: string;
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  closed:
    'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700',
  draft:
    'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700',
  in_progress:
    'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700',
  released:
    'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700',
};

const BADGE_BASE_CLASS =
  'inline-flex items-center px-1 py-0.5 rounded text-[10px] font-semibold border';

export function DaysHeaderStatusBadge({ status, archived }: DaysHeaderStatusBadgeProps) {
  const { language, t } = useI18n();

  if (archived) {
    return (
      <span
        className={`${BADGE_BASE_CLASS} bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600`}
      >
        {t('sprint.status.archived')}
      </span>
    );
  }

  const statusClass = STATUS_BADGE_CLASS[status];
  if (!statusClass) {
    return null;
  }

  return (
    <span className={`${BADGE_BASE_CLASS} ${statusClass}`}>
      {translateSprintStatus(status, language)}
    </span>
  );
}
