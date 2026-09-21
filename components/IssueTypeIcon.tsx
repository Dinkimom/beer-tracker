'use client';

import { Icon } from './Icon';

interface IssueTypeIconProps {
  className?: string;
  type?: string;
}

// Маппинг цветов для типов задач
const typeColors: Record<string, string> = {
  bug: 'text-red-600 dark:text-red-400',
  task: 'text-blue-600 dark:text-blue-400',
  epic: 'text-purple-600 dark:text-purple-400',
  story: 'text-green-600 dark:text-green-400',
  draft: 'text-amber-600 dark:text-amber-400',
};

/**
 * Компонент для отображения иконки типа задачи
 */
export function IssueTypeIcon({ type, className = 'w-4 h-4' }: IssueTypeIconProps) {
  const normalizedType = type?.toLowerCase() || 'task';

  const iconMap: Record<string, string> = {
    bug: 'issue-bug',
    task: 'issue-task',
    epic: 'issue-epic',
    story: 'issue-story',
    draft: 'issue-draft',
  };

  const iconName = iconMap[normalizedType] || iconMap.task;
  const colorClass = typeColors[normalizedType] || typeColors.task;

  return (
    <span className={`inline-flex items-center justify-center flex-shrink-0 ${colorClass}`}>
      <Icon
        className={className}
        name={iconName}
      />
    </span>
  );
}
