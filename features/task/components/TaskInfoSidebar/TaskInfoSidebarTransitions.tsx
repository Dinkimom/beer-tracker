'use client';

import type { Task } from '@/types';

import { useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { resolveTaskInfoActionTaskId } from '@/features/task/components/TaskInfoSidebar/resolveTaskInfoActionTaskId';
import { useTaskInfoSidebarTransitions } from '@/features/task/components/TaskInfoSidebar/useTaskInfoSidebarTransitions';
import { getStatusColors } from '@/utils/statusColors';

const TRANSITION_PILL_BASE_CLASS =
  'inline-flex h-7 cursor-pointer items-center rounded-md border px-2.5 text-sm font-medium shadow-none hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60';

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
  const { isLoading, transitions } = useTaskInfoSidebarTransitions(task);
  const [pendingTransitionId, setPendingTransitionId] = useState<string | null>(null);

  if (task.isLocalTask || !onStatusChange) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Icon className="h-4 w-4 animate-spin" name="spinner" />
        <span>{t('task.statusSelect.loadingTransitions')}</span>
      </div>
    );
  }

  if (transitions.length === 0) {
    return null;
  }

  const handleSelect = async (
    transitionId: string,
    targetStatusKey?: string,
    targetStatusDisplay?: string,
    screenId?: string
  ) => {
    if (pendingTransitionId) {
      return;
    }
    setPendingTransitionId(transitionId);
    try {
      await onStatusChange(
        resolveTaskInfoActionTaskId(task),
        transitionId,
        targetStatusKey,
        targetStatusDisplay,
        screenId
      );
    } finally {
      setPendingTransitionId(null);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {transitions.map((transition) => {
        const label = transition.to?.display || transition.display || transition.id;
        const targetStatus = transition.to?.key ?? transition.key ?? '';
        const statusColors = getStatusColors(targetStatus);
        const colorClasses = [
          statusColors.bg,
          statusColors.bgDark ?? '',
          statusColors.text,
          statusColors.textDark ?? '',
          statusColors.border,
          statusColors.borderDark ?? '',
        ]
          .filter(Boolean)
          .join(' ');
        const isPending = pendingTransitionId === transition.id;
        return (
          <Button
            key={transition.id}
            className={`${TRANSITION_PILL_BASE_CLASS} ${colorClasses}`}
            disabled={pendingTransitionId != null}
            type="button"
            variant="ghost"
            onClick={() =>
              void handleSelect(
                transition.id,
                transition.to?.key,
                transition.to?.display,
                transition.screen?.id
              )
            }
          >
            <span className="truncate">{label}</span>
            {isPending ? (
              <Icon className="ml-1.5 h-3.5 w-3.5 shrink-0 animate-spin" name="spinner" />
            ) : null}
          </Button>
        );
      })}
    </div>
  );
}
