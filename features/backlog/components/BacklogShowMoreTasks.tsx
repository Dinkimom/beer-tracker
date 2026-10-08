'use client';

import { useI18n } from '@/contexts/LanguageContext';

import { BACKLOG_HAIRLINE, BACKLOG_ROW_HOVER } from './backlogChromeClasses';

interface BacklogShowMoreTasksProps {
  count: number;
  onShowMore: () => void;
}

export function BacklogShowMoreTasks({ count, onShowMore }: BacklogShowMoreTasksProps) {
  const { t } = useI18n();
  if (count <= 0) return null;

  return (
    <button
      className={`w-full cursor-pointer border-t px-4 py-2 text-left text-sm font-medium text-blue-600 transition-all duration-200 active:scale-[0.98] dark:text-blue-400 ${BACKLOG_HAIRLINE} ${BACKLOG_ROW_HOVER}`}
      type="button"
      onClick={onShowMore}
    >
      {t('backlog.section.showMore', { count })}
    </button>
  );
}
