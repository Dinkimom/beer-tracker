/**
 * Компонент пустого состояния для TaskTimeline
 */

'use client';

import { useI18n } from '@/contexts/LanguageContext';

interface TaskTimelineEmptyProps {
  hasNoData?: boolean;
}

export function TaskTimelineEmpty({ hasNoData = false }: TaskTimelineEmptyProps) {
  const { t } = useI18n();

  if (hasNoData) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t('task.timeline.noWorkTestData')}
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700" />
      </div>
    );
  }

  return (
    <div className="py-4 text-sm text-gray-500 dark:text-gray-400">
      {t('task.timeline.noStatusData')}
    </div>
  );
}
