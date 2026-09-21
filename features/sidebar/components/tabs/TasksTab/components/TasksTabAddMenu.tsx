'use client';

import type { Task } from '@/types';

import { useMemo } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { useBoards } from '@/features/board/hooks/useBoards';
import { buildQuickAddQueueOptionsFromBoards } from '@/features/board/quickAddQueueOptions';
import { useSidebarTasksAdd } from '@/features/sidebar/hooks/useSidebarTasksAdd';
import { QuickAddMenu } from '@/features/task/components/TaskBar/components/quickAddMenu/QuickAddMenu';

interface TasksTabAddMenuProps {
  boardId: number | null | undefined;
  excludedIssueKeys: ReadonlySet<string>;
  selectedSprintId: number | null | undefined;
  onSprintTaskUpserted?: (task: Task) => void;
}

export function TasksTabAddMenu({
  boardId,
  excludedIssueKeys,
  onSprintTaskUpserted,
  selectedSprintId,
}: TasksTabAddMenuProps) {
  const { t } = useI18n();
  const { boards } = useBoards();
  const queueOptions = useMemo(() => buildQuickAddQueueOptionsFromBoards(boards), [boards]);
  const { attachExisting, createNew, isSubmitting } = useSidebarTasksAdd({
    onSprintTaskUpserted,
    selectedSprintId,
  });
  const resolvedBoardId = boardId ?? 0;

  if (!onSprintTaskUpserted || !selectedSprintId || resolvedBoardId <= 0) {
    return null;
  }

  const addLabel = t('sidebar.tasksTab.addTask');

  return (
    <QuickAddMenu
      addLabel={addLabel}
      boardId={resolvedBoardId}
      contentAlign="center"
      excludedIssueKeys={excludedIssueKeys}
      hintNew={t('sidebar.tasksTab.addNewHint')}
      isSubmitting={isSubmitting}
      modes={['new', 'existing']}
      queueOptions={queueOptions}
      submitLabel={t('sprintPlanner.swimlane.quickAddMenu.create')}
      trigger={
        <Button
          aria-haspopup="menu"
          aria-label={t('sidebar.tasksTab.addTaskAria')}
          className="h-8 w-full rounded-md px-3 text-xs font-semibold"
          title={t('sidebar.tasksTab.addTaskAria')}
          type="button"
          variant="primary"
        >
          <Icon className="mr-1.5 h-3.5 w-3.5" name="plus" />
          {addLabel}
        </Button>
      }
      onSelectExisting={attachExisting}
      onSubmitNew={createNew}
    />
  );
}
