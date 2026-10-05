/**
 * Компонент действий для TasksTab
 */

'use client';

import type { Task } from '@/types';

import { Button } from '@/components/Button';
import { useConfirmDialog } from '@/components/ConfirmDialog';
import { useI18n } from '@/contexts/LanguageContext';

import { TasksTabAddMenu } from './TasksTabAddMenu';

interface TasksTabActionsProps {
  boardId?: number | null;
  excludedIssueKeys: ReadonlySet<string>;
  selectedSprintId?: number | null;
  onReturnAllTasks?: () => void;
  onSprintTaskUpserted?: (task: Task) => void;
}

export function TasksTabActions({
  boardId,
  excludedIssueKeys,
  onReturnAllTasks,
  onSprintTaskUpserted,
  selectedSprintId,
}: TasksTabActionsProps) {
  const { t } = useI18n();
  const { confirm, DialogComponent } = useConfirmDialog();
  const canAdd = Boolean(
    onSprintTaskUpserted && selectedSprintId && boardId != null && boardId > 0
  );

  if (!onReturnAllTasks && !canAdd) {
    return null;
  }

  return (
    <>
      <div className="flex-shrink-0 space-y-2 border-t border-black/10 px-4 py-2.5 dark:border-white/10">
        {canAdd ? (
          <TasksTabAddMenu
            boardId={boardId}
            excludedIssueKeys={excludedIssueKeys}
            selectedSprintId={selectedSprintId}
            onSprintTaskUpserted={onSprintTaskUpserted}
          />
        ) : null}
        {onReturnAllTasks ? (
          <Button
            className="h-8 w-full rounded-md !border-red-600/25 !bg-red-600/10 px-3 text-xs font-semibold !text-red-800 hover:!bg-red-600/15 dark:!border-red-400/35 dark:!bg-red-500/15 dark:!text-red-200 dark:hover:!bg-red-500/25"
            title={t('sidebar.tasksTabActions.returnTitle')}
            type="button"
            variant="dangerOutline"
            onClick={async () => {
              const confirmed = await confirm(t('sidebar.tasksTabActions.returnConfirm'), {
                title: t('sidebar.tasksTabActions.returnConfirmTitle'),
                variant: 'default',
              });
              if (confirmed) {
                onReturnAllTasks();
              }
            }}
          >
            {t('sidebar.tasksTabActions.returnButton')}
          </Button>
        ) : null}
      </div>
      {DialogComponent}
    </>
  );
}
