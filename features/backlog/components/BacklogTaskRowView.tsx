'use client';

import type { Developer, Task } from '@/types';

import { Avatar } from '@/components/Avatar';
import { OverflowTooltip } from '@/components/OverflowTooltip';
import { StatusTag } from '@/components/StatusTag';
import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { resolveTaskCardBodyContext } from '@/features/task/components/TaskCard/components/taskCardBodyContextHelpers';
import { resolveTaskCardDisplayId } from '@/features/task/components/TaskCard/components/taskCardContentHelpers';
import { taskStatusLabel } from '@/features/task/utils/taskUtils';
import { formatTaskStoryPointsForDisplay, formatTaskTestPointsForDisplay } from '@/lib/pointsUtils';

import {
  BACKLOG_TASK_PARENT_SEPARATOR,
  formatBacklogTaskParentChain,
  resolveBacklogTaskParents,
} from '../utils/backlogTaskParents';

interface BacklogTaskRowViewProps {
  developers: Developer[];
  /** Поля без собственной рамки: чекбокс и отступы рисует строка. */
  embedded?: boolean;
  task: Task;
}

export function BacklogTaskRowView({ developers, embedded = false, task }: BacklogTaskRowViewProps) {
  const { t } = useI18n();
  const context = resolveTaskCardBodyContext({
    developers,
    displayDuration: undefined,
    t,
    task,
    variant: 'sidebar',
  });
  const taskKey = resolveTaskCardDisplayId(task);
  const pointParts = [
    task.storyPoints != null ? formatTaskStoryPointsForDisplay(task) : null,
    !context.hideTestPoints && task.testPoints != null ? formatTaskTestPointsForDisplay(task) : null,
  ].filter((part): part is string => part != null);
  const points = pointParts.join(' · ');
  const parents = resolveBacklogTaskParents(task);
  const parentsChain = formatBacklogTaskParentChain(parents);
  const parentsTitle = parentsChain ? t('backlog.task.parents', { chain: parentsChain }) : '';

  return (
    <div className={embedded ? 'contents' : 'flex min-w-0 items-center gap-3 px-4 py-2'}>
      <OverflowTooltip content={taskKey}>
        <span className="w-28 shrink-0 truncate text-xs font-medium text-blue-700 dark:text-blue-300">
          {taskKey}
        </span>
      </OverflowTooltip>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        {parents.length > 0 ? (
          <TextTooltip content={parentsTitle}>
          <span className="block truncate text-[11px] leading-4 text-ds-text-muted">
            {parents.map((parent, index) => (
              <span key={parent.key ?? parent.title}>
                {index > 0 ? BACKLOG_TASK_PARENT_SEPARATOR : null}
                {parent.key ? <span className="font-medium">{parent.key}</span> : null}
                {parent.key && parent.title ? ' ' : null}
                {parent.title || null}
              </span>
            ))}
          </span>
          </TextTooltip>
        ) : null}
        <OverflowTooltip content={task.name}>
          <span className="truncate text-sm text-gray-900 dark:text-gray-100">
            {task.name}
          </span>
        </OverflowTooltip>
      </span>
      <StatusTag
        className="max-w-[11rem] overflow-hidden text-ellipsis"
        label={taskStatusLabel(task)}
        status={task.originalStatus}
        statusColorKey={task.statusColorKey}
      />
      <span className="w-[7.5rem] shrink-0 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">
        {points}
      </span>
      <span className="inline-flex w-6 shrink-0 justify-center">
        {context.assigneeDisplayName ? (
          <Avatar
            avatarUrl={context.assigneeDeveloper?.avatarUrl}
            initials={context.assigneeInitials}
            initialsVariant={context.assigneeAvatarVariant}
            size="sm"
            title={context.assigneeDisplayName}
          />
        ) : null}
      </span>
    </div>
  );
}
