'use client';

import type { Task, TaskParent } from '@/types';

import { useEffect, useId, useRef } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { ParentSubmenuOptionsList } from '@/features/context-menu/components/ParentSubmenuOptionsList';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  CONTEXT_MENU_ITEM_ROW_ACTIVE,
  CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER,
  CONTEXT_MENU_ITEM_ROW_SUBMENU,
} from '@/features/context-menu/contextMenuClasses';
import { useContextMenuParentSearch } from '@/features/context-menu/hooks/useContextMenuParentSearch';
import {
  resolveContextMenuCurrentParentLabel,
  resolveTaskParentForMenu,
} from '@/features/context-menu/utils/buildContextMenuParentOptions';
import { calculateSubmenuPosition } from '@/features/context-menu/utils/submenuPositioning';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';
import { DELAYS } from '@/utils/constants';

interface ParentSubmenuProps {
  boardId: number | null;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  isLoading: boolean;
  isOpen: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  parentOptions: TaskParent[];
  task: Task;
  onSelect: (parent: TaskParent | null) => void;
  onToggle: () => void;
}

export function ParentSubmenu({
  boardId,
  buttonRef,
  isLoading,
  isOpen,
  menuRef,
  parentOptions,
  task,
  onSelect,
  onToggle,
}: ParentSubmenuProps) {
  const { t } = useI18n();
  const parentMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchInputId = useId();
  const currentParent = resolveTaskParentForMenu(task);
  const currentKey = currentParent?.key ?? '';

  const { handleSearchQueryChange, isSearching, searchQuery, visibleParents } =
    useContextMenuParentSearch({
      boardId,
      isOpen,
      parentOptions,
    });

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && parentMenuRef.current && buttonRef.current && menuRef.current) {
      const menuElement = menuRef.current;

      const updatePosition = () => {
        if (!parentMenuRef.current || !buttonRef.current || !menuElement) return;

        const menuRect = menuElement.getBoundingClientRect();
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const subMenuRect = parentMenuRef.current.getBoundingClientRect();
        const parentMenuParent = parentMenuRef.current.parentElement;
        if (!parentMenuParent) return;
        const parentRect = parentMenuParent.getBoundingClientRect();

        const { left, top } = calculateSubmenuPosition(menuRect, buttonRect, subMenuRect, parentRect);

        parentMenuRef.current.style.left = `${left}px`;
        parentMenuRef.current.style.top = `${top}px`;
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updatePosition();
          setTimeout(updatePosition, DELAYS.POSITIONING);
        });
      });
    }
  }, [isOpen, menuRef, buttonRef, visibleParents.length, isSearching, searchQuery]);

  const formattedLabel = resolveContextMenuCurrentParentLabel(task, parentOptions);
  const currentLabel = currentParent
    ? formattedLabel
    : t('sprintPlanner.contextMenu.parentNone');

  const trimmedQuery = searchQuery.trim();
  const showEmptyLocalHint = !trimmedQuery && parentOptions.length === 0 && !isSearching;
  const showNoResults =
    Boolean(trimmedQuery) && !isSearching && visibleParents.length === 0;
  const overlay = useOverlayPresence(isOpen);

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        className={`${CONTEXT_MENU_ITEM_ROW_SUBMENU} !items-start ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER} ${
          isOpen ? CONTEXT_MENU_ITEM_ROW_ACTIVE : ''
        } ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
        disabled={isLoading}
        type="button"
        variant="ghost"
        onClick={onToggle}
      >
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Icon
            aria-hidden
            className="mt-0.5 h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400"
            name="issue-story"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium leading-5">
              {t('sprintPlanner.contextMenu.parentIssue')}
            </span>
            <span className="mt-0.5 block truncate text-xs font-normal leading-4 text-gray-500 dark:text-gray-400">
              {currentLabel}
            </span>
          </span>
        </div>
        <Icon
          aria-hidden
          className={`mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-90' : ''
          }`}
          name="chevron-right"
        />
      </Button>
      {overlay.mounted ? (
        <div
          ref={parentMenuRef}
          className={`absolute flex max-h-[320px] min-w-[260px] max-w-[min(320px,calc(100vw-40px))] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white py-1.5 shadow-2xl dark:border-gray-700 dark:bg-gray-800 ${ZIndex.class('submenu')} ${OVERLAY_PANEL_ENTER}`}
          data-state={overlay.state}
          data-submenu="true"
          onAnimationEnd={overlay.onAnimationEnd}
        >
          <div className="shrink-0 border-b border-gray-100 px-2 pb-1.5 pt-0.5 dark:border-gray-700">
            <input
              ref={searchInputRef}
              className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400"
              disabled={isLoading}
              id={searchInputId}
              placeholder={t('sprintPlanner.contextMenu.parentSearchPlaceholder')}
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearchQueryChange(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <ParentSubmenuOptionsList
            currentKey={currentKey}
            isLoading={isLoading}
            isSearching={isSearching}
            showEmptyLocalHint={showEmptyLocalHint}
            showNoResults={showNoResults}
            visibleParents={visibleParents}
            onSelect={onSelect}
          />
        </div>
      ) : null}
    </div>
  );
}
