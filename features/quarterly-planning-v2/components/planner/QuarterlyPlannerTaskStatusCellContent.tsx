'use client';

import type { Task } from '@/types';

import { StatusTag } from '@/components/StatusTag';
import { TaskStatusSelect } from '@/features/task/components/TaskStatusSelect';
import { taskStatusLabel } from '@/features/task/utils/taskUtils';

interface QuarterlyPlannerTaskStatusCellContentProps {
  status?: string;
  statusColorKey?: string;
  task?: Pick<
    Task,
    'id' | 'name' | 'originalStatus' | 'originalStatusDisplay' | 'originalTaskId' | 'statusColorKey' | 'type'
  >;
  onStatusChange?: (
    transitionId: string,
    targetStatusKey?: string,
    targetStatusDisplay?: string,
    screenId?: string
  ) => void;
}

export function QuarterlyPlannerTaskStatusCellContent({
  onStatusChange,
  status,
  statusColorKey,
  task,
}: QuarterlyPlannerTaskStatusCellContentProps) {
  const canChangeStatus = task != null && onStatusChange != null && task.originalStatus;

  if (canChangeStatus) {
    return (
      <TaskStatusSelect
        className="w-full"
        task={task}
        onTransitionSelect={(transitionId, targetStatusKey, targetStatusDisplay, screenId) =>
          onStatusChange(transitionId, targetStatusKey, targetStatusDisplay, screenId)
        }
      />
    );
  }

  if (status) {
    return (
      <StatusTag
        className="max-w-full truncate text-[10px]"
        label={task ? taskStatusLabel(task) : undefined}
        status={status}
        statusColorKey={statusColorKey}
      />
    );
  }

  return null;
}
