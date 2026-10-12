'use client';

import type { TaskCardSlotItemContext } from './taskCardSlotItemContext';
import type { ResolvedTaskCardSlotItem } from '@/lib/taskCard/taskCardSlots';
import type { Task } from '@/types';

import { useIssueTrackerIssueWebUrl } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { resolveTaskCardDisplayId } from '@/features/task/components/TaskCard/components/taskCardContentHelpers';

import { useTaskCardKeyLinkProps } from '../components/useTaskCardKeyLinkProps';

import { TaskCardSlotItem } from './TaskCardSlotItem';

interface TaskCardSlotItemsProps {
  alignEnd?: boolean;
  context: TaskCardSlotItemContext;
  flow?: 'inline' | 'row';
  items: readonly ResolvedTaskCardSlotItem[];
  task: Task;
}

export function TaskCardSlotItems({
  alignEnd = false,
  context,
  flow = 'row',
  items,
  task,
}: TaskCardSlotItemsProps) {
  const { t } = useI18n();
  const displayId = context.displayId || resolveTaskCardDisplayId(task);
  const trackerUrl = useIssueTrackerIssueWebUrl(displayId);
  const keyLinkProps = useTaskCardKeyLinkProps({
    displayId,
    isDragging: context.isDragging ?? false,
    t,
    trackerUrl,
  });

  if (items.length === 0) {
    return null;
  }

  const className = flow === 'inline'
    ? 'inline-flex items-center gap-1 align-middle'
    : `flex min-w-0 flex-wrap items-center gap-1.5${alignEnd ? ' ml-auto justify-end' : ''}`;

  return (
    <span className={className} data-task-card-slot-items="">
      {items.map((item) => (
        <TaskCardSlotItem
          key={item.customFieldId ?? item.field}
          context={{ ...context, displayId }}
          item={item}
          keyLinkProps={keyLinkProps}
          task={task}
        />
      ))}
    </span>
  );
}
