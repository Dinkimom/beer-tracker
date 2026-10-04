'use client';

import type { SprintListItem } from '@/types/tracker';

import { useEffect, useRef } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  FLOATING_MENU_SHELL,
  FLOATING_TOOLBAR_ITEM_IDLE,
  FLOATING_TOOLBAR_ITEM_ON,
} from '@/features/context-menu/contextMenuClasses';
import { formatSprintListItemDisplayName } from '@/utils/sprintDisplayName';

const MENU_TRIGGER_CLASS = `!h-9 !min-h-0 !min-w-0 !gap-2 !rounded-lg !px-3 !py-0 text-sm font-medium ${CONTEXT_MENU_GHOST_BUTTON_RESET}`;

const MENU_TRIGGER_OPEN_CLASS = FLOATING_TOOLBAR_ITEM_ON;

const MENU_ITEM_CLASS = `!h-9 !min-h-0 w-full !justify-start !gap-2 !rounded-none !px-3 !py-0 text-sm font-medium ${CONTEXT_MENU_GHOST_BUTTON_RESET} text-gray-700 hover:!bg-gray-50 dark:text-gray-200 dark:hover:!bg-gray-700`;

interface BacklogBulkSprintMenuProps {
  disabled?: boolean;
  open: boolean;
  sprints: SprintListItem[];
  onOpenChange: (open: boolean) => void;
  onSelect: (sprintId: number) => void;
}

export function BacklogBulkSprintMenu({
  disabled = false,
  open,
  sprints,
  onOpenChange,
  onSelect,
}: BacklogBulkSprintMenuProps) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [onOpenChange, open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        aria-expanded={open}
        aria-haspopup="menu"
        className={`${MENU_TRIGGER_CLASS} ${open ? MENU_TRIGGER_OPEN_CLASS : FLOATING_TOOLBAR_ITEM_IDLE}`}
        disabled={disabled || sprints.length === 0}
        type="button"
        variant="ghost"
        onClick={() => onOpenChange(!open)}
      >
        {t('backlog.bulk.moveToSprint')}
        <Icon className="h-4 w-4" name="chevron-down" />
      </Button>
      {open ? (
        <div
          className={`absolute bottom-full left-0 z-10 mb-2 max-h-64 min-w-56 overflow-y-auto py-1 ${FLOATING_MENU_SHELL}`}
          role="menu"
        >
          {sprints.map((sprint) => (
            <Button
              key={sprint.id}
              className={MENU_ITEM_CLASS}
              role="menuitem"
              type="button"
              variant="ghost"
              onClick={() => onSelect(sprint.id)}
            >
              <span className="truncate">{formatSprintListItemDisplayName(sprint)}</span>
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
