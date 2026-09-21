'use client';

import type { SprintListItem } from '@/types/tracker';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { useTasks } from '@/features/task/hooks/useTasks';
import { formatSprintListItemDisplayName } from '@/utils/sprintDisplayName';

import { ArchivedSprintTaskList } from './ArchivedSprintTaskList';

interface ArchivedSprintItemProps {
  expanded: boolean;
  sprint: SprintListItem;
  onClick: () => void;
}

export function ArchivedSprintItem({ expanded, onClick, sprint }: ArchivedSprintItemProps) {
  const { language } = useI18n();
  const dateLocale = language === 'en' ? 'en-US' : 'ru-RU';
  const { data, isLoading } = useTasks(expanded ? sprint.id : null);
  const tasks = data?.tasks || [];
  const developers = data?.developers || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(dateLocale, {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const formatSprintDates = (startDate: string, endDate: string) => {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Sprint header - кликабельный */}
      <Button
        className="h-auto min-h-0 w-full justify-start gap-2 rounded-none px-3 py-2.5 text-left font-normal hover:bg-gray-50 dark:hover:bg-gray-700/50"
        type="button"
        variant="ghost"
        onClick={onClick}
      >
        <Icon
          className={`w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform ${
            expanded ? 'rotate-90' : ''
          }`}
          name="chevron-right"
        />
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {formatSprintListItemDisplayName(sprint)}
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
            <Icon className="w-3.5 h-3.5" name="calendar" />
            <span>{formatSprintDates(sprint.startDate, sprint.endDate)}</span>
          </div>
        </div>
      </Button>

      {/* Раскрытое содержимое с задачами */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
          <ArchivedSprintTaskList
            developers={developers}
            isLoading={isLoading}
            selectedSprintId={sprint.id}
            tasks={tasks}
          />
        </div>
      )}
    </div>
  );
}

