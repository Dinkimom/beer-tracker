'use client';

import type { SprintListItem } from '@/types/tracker';

import { useRef, useEffect } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  CONTEXT_MENU_ITEM_ROW_ACTIVE,
  CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER,
  CONTEXT_MENU_ITEM_ROW_SUBMENU,
} from '@/features/context-menu/contextMenuClasses';
import { calculateSubmenuPosition } from '@/features/context-menu/utils/submenuPositioning';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';
import { DELAYS } from '@/utils/constants';
import { formatSprintListItemDisplayName } from '@/utils/sprintDisplayName';

interface SprintSubmenuProps {
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  currentSprintId: number | null;
  isBacklogTask: boolean;
  isLoading: boolean;
  isOpen: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  sprints: SprintListItem[];
  onSelect: (sprintId: number) => void;
  onToggle: () => void;
}

export function SprintSubmenu({
  sprints,
  currentSprintId,
  isBacklogTask,
  isOpen,
  menuRef,
  buttonRef,
  isLoading,
  onToggle,
  onSelect,
}: SprintSubmenuProps) {
  const { t } = useI18n();
  const sprintMenuRef = useRef<HTMLDivElement>(null);

  const availableSprints = isBacklogTask
    ? sprints.filter((s) => !s.archived && (s.status === 'in_progress' || s.status === 'draft'))
    : sprints.filter((s) => s.id !== currentSprintId && !s.archived);

  const overlay = useOverlayPresence(isOpen);

  useEffect(() => {
    if (isOpen && sprintMenuRef.current && buttonRef.current && menuRef.current) {
      const menuElement = menuRef.current;

      const updatePosition = () => {
        if (!sprintMenuRef.current || !buttonRef.current || !menuElement) return;

        const menuRect = menuElement.getBoundingClientRect();
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const subMenuRect = sprintMenuRef.current.getBoundingClientRect();
        const sprintMenuParent = sprintMenuRef.current.parentElement;
        if (!sprintMenuParent) return;
        const parentRect = sprintMenuParent.getBoundingClientRect();

        const { left, top } = calculateSubmenuPosition(menuRect, buttonRect, subMenuRect, parentRect);

        sprintMenuRef.current.style.left = `${left}px`;
        sprintMenuRef.current.style.top = `${top}px`;
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updatePosition();
          setTimeout(updatePosition, DELAYS.POSITIONING);
        });
      });
    }
  }, [isOpen, menuRef, buttonRef]);

  if (availableSprints.length === 0) {
    return null;
  }

  const rootLabel = isBacklogTask
    ? t('sprintPlanner.contextMenu.addToSprint')
    : t('sprintPlanner.contextMenu.moveToSprint');

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        className={`${CONTEXT_MENU_ITEM_ROW_SUBMENU} ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER} ${
          isOpen ? CONTEXT_MENU_ITEM_ROW_ACTIVE : ''
        } ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
        disabled={isLoading}
        type="button"
        variant="ghost"
        onClick={onToggle}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Icon
            aria-hidden
            className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400"
            name="calendar"
          />
          <span className="min-w-0 truncate font-medium">{rootLabel}</span>
        </div>
        <Icon
          aria-hidden
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-90' : ''
          }`}
          name="chevron-right"
        />
      </Button>
      {overlay.mounted ? (
        <div
          ref={sprintMenuRef}
          className={`absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl py-1.5 min-w-[280px] max-w-[min(320px,calc(100vw-40px))] max-h-[300px] overflow-y-auto ${ZIndex.class('submenu')} ${OVERLAY_PANEL_ENTER}`}
          data-state={overlay.state}
          data-submenu="true"
          onAnimationEnd={overlay.onAnimationEnd}
        >
          {availableSprints.map((sprint) => (
            <Button
              key={sprint.id}
              className="h-auto min-h-0 w-full rounded-none border-0 bg-transparent px-4 py-2.5 text-left text-sm text-gray-700 shadow-none hover:!bg-gray-50 dark:text-gray-300 dark:hover:!bg-gray-700"
              disabled={isLoading || sprint.id === currentSprintId}
              type="button"
              variant="ghost"
              onClick={() => onSelect(sprint.id)}
            >
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {formatSprintListItemDisplayName(sprint)}
              </div>
              <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {sprint.startDate && sprint.endDate
                  ? `${new Date(sprint.startDate).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })} - ${new Date(sprint.endDate).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}`
                  : t('sprintPlanner.contextMenu.sprintNoDates')}
              </div>
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
