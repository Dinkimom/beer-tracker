/**
 * Компонент состояния загрузки для TaskTimeline
 */

'use client';

import { useI18n } from '@/contexts/LanguageContext';

export function TaskTimelineLoading() {
  const { t } = useI18n();

  return (
    <div className="py-4 text-sm text-gray-500 dark:text-gray-400">
      {t('task.timeline.loading')}
    </div>
  );
}
