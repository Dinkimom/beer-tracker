'use client';

import type { TaskCardSlotItemContext } from '../slots/taskCardSlotItemContext';
import type { ResolvedTaskCardSlotItem } from '@/lib/taskCard/taskCardSlots';
import type { Task } from '@/types';

import { IssueTypeIcon } from '@/components/IssueTypeIcon';
import { PriorityIcon } from '@/components/PriorityIcon';
import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';

import { TaskCardSlotItems } from '../slots/TaskCardSlotItems';

import { buildTaskCardKeyLinkProps } from './taskCardContentHelpers';

interface TaskCardSidebarContentProps {
  displayId: string;
  keyLinkProps: ReturnType<typeof buildTaskCardKeyLinkProps>;
  slotContext?: TaskCardSlotItemContext;
  task: Task;
  teamTextColor: string;
  /** Канбан: поля перед названием из раскладки слотов вместо приоритета, типа и ключа. */
  titleLeadItems?: readonly ResolvedTaskCardSlotItem[];
}

export function TaskCardSidebarContent({
  displayId,
  keyLinkProps,
  slotContext,
  task,
  teamTextColor,
  titleLeadItems,
}: TaskCardSidebarContentProps) {
  const { t } = useI18n();
  const title = <span className="font-bold">{' '}{task.name || t('task.card.untitled')}</span>;

  if (titleLeadItems && slotContext) {
    return (
      <div className="relative flex flex-col justify-start flex-1 overflow-hidden min-h-0">
        <div className={`text-xs leading-snug break-words line-clamp-3 ${teamTextColor}`}>
          <TaskCardSlotItems context={slotContext} flow="inline" items={titleLeadItems} task={task} />
          {title}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col justify-start flex-1 overflow-hidden min-h-0">
      <div className={`text-xs leading-snug break-words line-clamp-3 ${teamTextColor}`}>
        <span className="inline-flex items-center gap-1 mr-1.5 align-middle shrink-0">
          {task.priority && <PriorityIcon className="w-4 h-4 shrink-0" priority={task.priority} />}
          <IssueTypeIcon className="w-4 h-4 shrink-0" type={task.type} />
        </span>
        <TextTooltip content={keyLinkProps.title}>
        <a
          className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          {...keyLinkProps}
          title={undefined}
        >
          {displayId}
        </a>
        </TextTooltip>
        {title}
      </div>
    </div>
  );
}
