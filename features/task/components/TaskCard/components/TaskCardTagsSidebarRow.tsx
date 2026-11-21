'use client';

import type { Task } from '@/types';

import { StatusTag } from '@/components/StatusTag';
import { taskStatusLabel } from '@/features/task/utils/taskUtils';


interface TaskCardTagsSidebarRowProps {
  hideTestPoints: boolean;
  showStoryPoints: boolean;
  showTestPoints: boolean;
  spText: string;
  tagTextSize: string;
  task: Task;
  tpText: string;
}

export function TaskCardTagsSidebarRow({
  hideTestPoints,
  showStoryPoints,
  showTestPoints,
  spText,
  tagTextSize,
  task,
  tpText,
}: TaskCardTagsSidebarRowProps) {
  return (
    <div className="flex items-center gap-2 min-w-0 overflow-hidden">
      <StatusTag
        label={taskStatusLabel(task)}
        status={task.originalStatus}
        statusColorKey={task.statusColorKey}
      />
      <div className={`flex items-center gap-0 shrink-0 flex-wrap ${tagTextSize} text-gray-600 dark:text-white`}>
        {showStoryPoints ? <span>{spText}</span> : null}
        {showTestPoints && !hideTestPoints ? (
          <>
            {showStoryPoints ? <span className="mx-1">·</span> : null}
            <span>{tpText}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
