'use client';

import type { Task } from '@/types';

import { IssueTypeIcon } from '@/components/IssueTypeIcon';
import { PriorityIcon } from '@/components/PriorityIcon';

interface TaskCardSwimlaneMetaIconsRowProps {
  inlineIconSize: string;
  showMetaIcons: boolean;
  showPriorityIcon: boolean;
  showTypeIcon: boolean;
  task: Task;
}

export function TaskCardSwimlaneMetaIconsRow({
  showMetaIcons,
  showPriorityIcon,
  showTypeIcon,
  task,
  inlineIconSize,
}: TaskCardSwimlaneMetaIconsRowProps) {
  if (!showMetaIcons) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-0.5 mr-1 align-middle shrink-0">
      {showPriorityIcon && (
        <PriorityIcon className={`${inlineIconSize} shrink-0`} priority={task.priority!} />
      )}
      {showTypeIcon && (
        <IssueTypeIcon className={`${inlineIconSize} shrink-0`} type={task.type} />
      )}
    </span>
  );
}
