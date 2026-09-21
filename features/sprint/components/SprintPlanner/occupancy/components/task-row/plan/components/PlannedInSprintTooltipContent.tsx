'use client';

import { useQuery } from '@tanstack/react-query';

import { Icon } from '@/components/Icon';
import { TaskCard } from '@/features/task/components/TaskCard/TaskCard';
import { getTaskByKey } from '@/lib/api/issues';

export function PlannedInSprintTooltipContent({
  taskKey,
}: {
  taskKey: string;
}) {
  const { data: task, isLoading, isError } = useQuery({
    queryKey: ['issue-task', taskKey],
    queryFn: () => getTaskByKey(taskKey),
    enabled: !!taskKey,
    staleTime: 60 * 1000,
  });
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 min-w-[200px]">
        <Icon className="animate-spin h-6 w-6 text-gray-400" name="spinner" />
      </div>
    );
  }
  if (isError || !task) {
    return (
      <span className="text-xs text-gray-500 dark:text-gray-400">
        Не удалось загрузить задачу
      </span>
    );
  }
  return (
    <div className="w-[340px] shrink-0">
      <TaskCard developers={[]} task={task} variant="sidebar" />
    </div>
  );
}
