'use client';

import type { SprintListItem } from '@/types/tracker';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { useTasks } from '@/features/task/hooks/useTasks';
import { formatSprintListItemDisplayName } from '@/utils/sprintDisplayName';

import { formatSprintRangeLabel } from '../utils/sprintUtils';

import { ArchivedSprintTaskList } from './ArchivedSprintTaskList';

interface ArchivedSprintItemProps {
  expanded: boolean;
  sprint: SprintListItem;
  onClick: () => void;
}

export function ArchivedSprintItem({ expanded, onClick, sprint }: ArchivedSprintItemProps) {
  const { language } = useI18n();
  const dateLocale = language === 'en' ? 'en-US' : 'ru-RU';
  const dateLabel = formatSprintRangeLabel(sprint.startDate, sprint.endDate, dateLocale);
  const { data, isLoading } = useTasks(expanded ? sprint.id : null);
  const tasks = data?.tasks || [];
  const developers = data?.developers || [];

  return (
    <div>
      <button
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40"
        type="button"
        onClick={onClick}
      >
        <Icon
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform dark:text-gray-500 ${
            expanded ? 'rotate-90' : ''
          }`}
          name="chevron-right"
        />
        <span className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-gray-100">
          {formatSprintListItemDisplayName(sprint)}
        </span>
        {dateLabel ? (
          <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{dateLabel}</span>
        ) : null}
      </button>
      {expanded ? <ArchivedSprintTaskList developers={developers} isLoading={isLoading} tasks={tasks} /> : null}
    </div>
  );
}
