'use client';

import type { Developer, Task } from '@/types';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { DraggableTask } from '@/features/task/components/DraggableTask';

interface SprintColumnTasksProps {
  developers: Developer[];
  emptyLabel: string;
  error: unknown;
  isLoading: boolean;
  loadErrorTitle: string;
  loadingLabel: string;
  retryLabel: string;
  sprintId: number;
  tasks: Task[];
  unknownErrorLabel: string;
  onRetry: () => void;
}

function sprintColumnErrorMessage(error: unknown, unknownErrorLabel: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  return unknownErrorLabel;
}

export function SprintColumnTasks({
  developers,
  error,
  isLoading,
  loadErrorTitle,
  loadingLabel,
  retryLabel,
  unknownErrorLabel,
  emptyLabel,
  sprintId,
  tasks,
  onRetry,
}: SprintColumnTasksProps) {
  if (isLoading) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
        <Icon className="animate-spin h-4 w-4 mx-auto mb-2" name="spinner" />
        {loadingLabel}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 px-3 text-center">
        <Icon className="h-4 w-4 text-red-500 dark:text-red-400" name="circle-x" />
        <div className="text-red-500 dark:text-red-400 text-sm">
          <p>{loadErrorTitle}</p>
          <p className="text-xs mt-1">{sprintColumnErrorMessage(error, unknownErrorLabel)}</p>
        </div>
        <Button className="gap-2 px-3 py-2" type="button" variant="outline" onClick={onRetry}>
          <Icon className="h-4 w-4" name="refresh" />
          {retryLabel}
        </Button>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
        {emptyLabel}
      </div>
    );
  }

  return (
    <>
      {tasks.map((task) => (
        <DraggableTask
          key={task.id}
          developers={developers}
          selectedSprintId={sprintId}
          task={task}
          viewMode="compact"
        />
      ))}
    </>
  );
}
