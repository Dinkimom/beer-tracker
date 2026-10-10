'use client';

import type { Task } from '@/types';

import { useState } from 'react';

import { StatusTag } from '@/components/StatusTag';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { resolveTaskInfoActionTaskId } from '@/features/task/components/TaskInfoSidebar/resolveTaskInfoActionTaskId';
import { TaskStatusSelect } from '@/features/task/components/TaskStatusSelect';
import { taskStatusLabel } from '@/features/task/utils/taskUtils';

interface TaskInfoSidebarTransitionsProps {
  task: Task;
  onStatusChange?: (
    taskId: string,
    transitionId: string,
    targetStatusKey?: string,
    targetStatusDisplay?: string,
    screenId?: string
  ) => Promise<void>;
}

export function TaskInfoSidebarTransitions({
  task,
  onStatusChange,
}: TaskInfoSidebarTransitionsProps) {
  const { t } = useI18n();
  const [isPending, setIsPending] = useState(false);
  const status = task.originalStatus?.trim() || null;
  const canChangeStatus = Boolean(onStatusChange) && !task.isLocalTask && Boolean(status);

  if (!status) {
    return null;
  }

  const handleTransitionSelect = (
    transitionId: string,
    targetStatusKey?: string,
    targetStatusDisplay?: string,
    screenId?: string
  ) => {
    if (!onStatusChange || isPending) {
      return;
    }
    setIsPending(true);
    onStatusChange(
      resolveTaskInfoActionTaskId(task),
      transitionId,
      targetStatusKey,
      targetStatusDisplay,
      screenId
    )
      .catch(() => undefined)
      .finally(() => {
        setIsPending(false);
      });
  };

  return (
    <div className="mb-3">
      <p className="mb-1.5 text-xs font-medium text-ds-text-muted">{t('sprintPlanner.taskInfo.status')}</p>
      {canChangeStatus ? (
        <TaskStatusSelect
          className="w-fit max-w-full"
          disabled={isPending}
          fullWidth={false}
          menuZIndex={ZIndex.value('popupContent')}
          task={task}
          onTransitionSelect={handleTransitionSelect}
        />
      ) : (
        <StatusTag
          label={taskStatusLabel(task)}
          status={status}
          statusColorKey={task.statusColorKey}
        />
      )}
    </div>
  );
}
