'use client';

import type { Task } from '@/types';

import { useI18n } from '@/contexts/LanguageContext';

interface TaskInfoSidebarMetaFieldsProps {
  task: Task;
}

interface MetaFieldItem {
  key: string;
  label: string;
  value: string;
}

export function TaskInfoSidebarMetaFields({ task }: TaskInfoSidebarMetaFieldsProps) {
  const { t } = useI18n();

  const items: MetaFieldItem[] = [];
  const assignee = task.assigneeName?.trim() || task.assignee?.trim();
  if (assignee) {
    items.push({
      key: 'assignee',
      label: t('sprintPlanner.taskInfo.assignee'),
      value: assignee,
    });
  }
  if (task.priority?.trim()) {
    items.push({
      key: 'priority',
      label: t('sprintPlanner.taskInfo.priority'),
      value: task.priority.trim(),
    });
  }
  if (task.storyPoints != null && task.storyPoints > 0) {
    items.push({
      key: 'storyPoints',
      label: t('sprintPlanner.taskInfo.storyPoints'),
      value: String(task.storyPoints),
    });
  }
  if (
    !task.hideTestPointsByIntegration &&
    task.testPoints != null &&
    task.testPoints > 0
  ) {
    items.push({
      key: 'testPoints',
      label: t('sprintPlanner.taskInfo.testPoints'),
      value: String(task.testPoints),
    });
  }
  if (task.type?.trim()) {
    items.push({
      key: 'type',
      label: t('sprintPlanner.taskInfo.type'),
      value: task.type.trim(),
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
      {items.map((item) => (
        <div key={item.key} className="flex min-w-0 items-baseline gap-1.5">
          <dt className="shrink-0 text-ds-text-muted">{item.label}</dt>
          <dd className="min-w-0 truncate font-medium text-gray-800 dark:text-gray-100">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
