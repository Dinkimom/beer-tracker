'use client';

import { useI18n } from '@/contexts/LanguageContext';

interface BacklogShowMoreTasksProps {
  count: number;
  onShowMore: () => void;
}

export function BacklogShowMoreTasks({ count, onShowMore }: BacklogShowMoreTasksProps) {
  const { t } = useI18n();
  if (count <= 0) return null;

  return (
    <button
      className="w-full cursor-pointer border-t border-gray-100 px-4 py-2 text-left text-sm font-medium text-blue-600 hover:bg-gray-50 dark:border-gray-700 dark:text-blue-400 dark:hover:bg-gray-800/60"
      type="button"
      onClick={onShowMore}
    >
      {t('backlog.section.showMore', { count })}
    </button>
  );
}
