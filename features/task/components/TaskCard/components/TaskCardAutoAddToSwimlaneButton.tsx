'use client';

import type { Task } from '@/types';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { canAutoAddTaskToSwimlane } from '@/features/task/utils/canAutoAddTaskToSwimlane';

interface TaskCardAutoAddToSwimlaneButtonProps {
  developerIds: readonly string[];
  estimatedSP: number;
  task: Task;
  onAutoAddToSwimlane: (task: Task) => void;
}

export function TaskCardAutoAddToSwimlaneButton({
  task,
  developerIds,
  estimatedSP,
  onAutoAddToSwimlane,
}: TaskCardAutoAddToSwimlaneButtonProps) {
  const { t } = useI18n();
  if (!canAutoAddTaskToSwimlane({ developerIds, estimatedSP, task })) {
    return null;
  }

  return (
    <Button
      className="absolute left-0 top-1/2 z-10 !h-6 !w-6 -translate-x-1/2 -translate-y-1/2 !min-h-0 !min-w-0 !justify-center !rounded border border-gray-300 !bg-white !p-0 text-gray-500 opacity-0 shadow transition-opacity hover:!border-blue-400 hover:!bg-blue-50 hover:!text-blue-600 group-hover:opacity-100 dark:border-gray-500 dark:!bg-gray-800 dark:text-gray-400 dark:hover:!border-blue-500 dark:hover:!bg-blue-600 dark:hover:!text-blue-300"
      title={t('task.card.autoAddSwimlaneTitle')}
      type="button"
      variant="outline"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onAutoAddToSwimlane(task);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Icon className="h-3 w-3" name="chevron-left" />
    </Button>
  );
}
