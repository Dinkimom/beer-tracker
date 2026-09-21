'use client';

import type { Task } from '@/types';

import { IssueTypeIcon } from '@/components/IssueTypeIcon';
import { PriorityIcon } from '@/components/PriorityIcon';
import { useI18n } from '@/contexts/LanguageContext';

import { buildTaskCardKeyLinkProps } from './taskCardContentHelpers';

interface TaskCardSidebarContentProps {
  displayId: string;
  keyLinkProps: ReturnType<typeof buildTaskCardKeyLinkProps>;
  task: Task;
  teamTextColor: string;
}

export function TaskCardSidebarContent({
  displayId,
  keyLinkProps,
  task,
  teamTextColor,
}: TaskCardSidebarContentProps) {
  const { t } = useI18n();

  return (
    <div className="relative flex flex-col justify-start flex-1 overflow-hidden min-h-0">
      <div className={`text-xs leading-snug break-words line-clamp-3 ${teamTextColor}`}>
        <span className="inline-flex items-center gap-1 mr-1.5 align-middle shrink-0">
          {task.priority && <PriorityIcon className="w-4 h-4 shrink-0" priority={task.priority} />}
          <IssueTypeIcon className="w-4 h-4 shrink-0" type={task.type} />
        </span>
        <a
          className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          {...keyLinkProps}
        >
          {displayId}
        </a>
        <span className="font-bold">{' '}{task.name || t('task.card.untitled')}</span>
      </div>
    </div>
  );
}
