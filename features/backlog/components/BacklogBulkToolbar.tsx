'use client';

import type { Developer, Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { useEffect, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  FLOATING_MENU_SHELL,
  FLOATING_TOOLBAR_GLASS,
  FLOATING_TOOLBAR_ITEM_IDLE,
} from '@/features/context-menu/contextMenuClasses';

import { useBacklogBulkMove } from '../hooks/useBacklogBulkMove';

import { BacklogBulkSprintMenu } from './BacklogBulkSprintMenu';
import { useBacklogSelection } from './BacklogSelectionProvider';

const TOOLBAR_ACTION_CLASS = `!h-9 !min-h-0 !min-w-0 !gap-2 !rounded-lg !px-3 !py-0 text-sm font-medium ${CONTEXT_MENU_GHOST_BUTTON_RESET} ${FLOATING_TOOLBAR_ITEM_IDLE}`;

const TOOLBAR_ICON_CLASS = `!h-9 !w-9 !min-h-0 !min-w-0 !gap-0 !rounded-lg !px-0 !py-0 ${CONTEXT_MENU_GHOST_BUTTON_RESET} ${FLOATING_TOOLBAR_ITEM_IDLE}`;

const TOOLBAR_SEPARATOR_CLASS = 'mx-1 h-6 w-px shrink-0 self-center bg-gray-200 dark:bg-gray-600';

interface BacklogBulkToolbarProps {
  activeSprints: SprintListItem[];
  backlogDevelopers: Developer[];
  backlogTasks: Task[];
  boardId: number | null;
  movingRef: { current: boolean };
  addTask: (task: Task) => void;
  removeTask: (taskId: string) => void;
}

export function BacklogBulkToolbar({
  activeSprints,
  addTask,
  backlogDevelopers,
  backlogTasks,
  boardId,
  movingRef,
  removeTask,
}: BacklogBulkToolbarProps) {
  const { t } = useI18n();
  const { clear, selectAllVisible, selectedCount } = useBacklogSelection();
  const { moveToBacklog, moveToSprint, moving } = useBacklogBulkMove({
    activeSprints,
    addTask,
    backlogDevelopers,
    backlogTasks,
    boardId,
    movingRef,
    removeTask,
  });
  const [sprintMenuOpen, setSprintMenuOpen] = useState(false);

  useEffect(() => {
    if (selectedCount === 0) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || moving) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) {
        return;
      }
      if (sprintMenuOpen) {
        setSprintMenuOpen(false);
        return;
      }
      clear();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [clear, moving, selectedCount, sprintMenuOpen]);

  if (selectedCount === 0) return null;

  return (
    <div className={`pointer-events-none fixed inset-x-0 bottom-8 flex justify-center px-4 ${ZIndex.class('floatingControls')}`}>
      <div
        aria-label={t('backlog.bulk.toolbar')}
        className={`pointer-events-auto flex max-w-full items-center gap-1 px-1.5 py-1.5 !rounded-xl ${FLOATING_MENU_SHELL} ${FLOATING_TOOLBAR_GLASS}`}
        role="toolbar"
      >
        <span className="shrink-0 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('backlog.bulk.selected', { count: selectedCount })}
        </span>
        <span className={TOOLBAR_SEPARATOR_CLASS} />
        <Button
          className={TOOLBAR_ACTION_CLASS}
          disabled={moving}
          type="button"
          variant="ghost"
          onClick={selectAllVisible}
        >
          {t('backlog.bulk.selectAll')}
        </Button>
        <BacklogBulkSprintMenu
          disabled={moving}
          open={sprintMenuOpen}
          sprints={activeSprints}
          onOpenChange={setSprintMenuOpen}
          onSelect={(sprintId) => {
            setSprintMenuOpen(false);
            void moveToSprint(sprintId);
          }}
        />
        <Button
          className={TOOLBAR_ACTION_CLASS}
          disabled={moving}
          type="button"
          variant="ghost"
          onClick={() => {
            setSprintMenuOpen(false);
            void moveToBacklog();
          }}
        >
          {t('backlog.bulk.moveToBacklog')}
        </Button>
        <span className={TOOLBAR_SEPARATOR_CLASS} />
        <Button
          aria-label={t('backlog.bulk.clear')}
          className={TOOLBAR_ICON_CLASS}
          disabled={moving}
          type="button"
          variant="ghost"
          onClick={clear}
        >
          <Icon className="h-4 w-4" name="close" />
        </Button>
      </div>
    </div>
  );
}
