'use client';

import type { Task, TaskParent } from '@/types';

import * as Popover from '@radix-ui/react-popover';
import { useId, useRef } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
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

interface ParentSubmenuProps {
  boardId: number | null;
  isLoading: boolean;
  isOpen: boolean;
  parentOptions: TaskParent[];
  task: Task;
  onSelect: (parent: TaskParent | null) => void;
  onToggle: () => void;
}

const PARENT_SUBMENU_MAX_HEIGHT_PX = 320;

export function ParentSubmenu({
  boardId,
  isLoading,
  isOpen,
  parentOptions,
  task,
  onSelect,
  onToggle,
}: ParentSubmenuProps) {
  const { t } = useI18n();
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

  const formattedLabel = resolveContextMenuCurrentParentLabel(task, parentOptions);
  const currentLabel = currentParent
    ? formattedLabel
    : t('sprintPlanner.contextMenu.parentNone');

  const trimmedQuery = searchQuery.trim();
  const showEmptyLocalHint = !trimmedQuery && parentOptions.length === 0 && !isSearching;
  const showNoResults =
    Boolean(trimmedQuery) && !isSearching && visibleParents.length === 0;

  return (
    <Popover.Root
      modal={false}
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (nextOpen !== isOpen) onToggle();
      }}
    >
      <Popover.Trigger asChild>
        <Button
          className={`${CONTEXT_MENU_ITEM_ROW_SUBMENU} !items-start ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER} ${
            isOpen ? CONTEXT_MENU_ITEM_ROW_ACTIVE : ''
          } ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
          disabled={isLoading}
          type="button"
          variant="ghost"
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
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className={`flex max-h-[320px] min-w-[260px] max-w-[min(320px,calc(100vw-40px))] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white py-1.5 shadow-2xl outline-none dark:border-gray-700 dark:bg-gray-800 ${ZIndex.class('submenu')} ${OVERLAY_FLOATING_ANIMATION}`}
          collisionPadding={10}
          data-submenu="true"
          side="right"
          sideOffset={2}
          style={{
            maxHeight: `min(${PARENT_SUBMENU_MAX_HEIGHT_PX}px, calc(100vh - 20px))`,
            // Radix копирует computed z-index на портал-обёртку. Класс из ZIndex.class
            // в CSS не генерируется, без инлайна обёртка остаётся auto и подложка меню перехватывает колесо.
            zIndex: ZIndex.submenu,
          }}
          updatePositionStrategy="always"
          onCloseAutoFocus={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            searchInputRef.current?.focus();
          }}
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
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin-custom"
            style={{ maxHeight: 'min(272px, calc(100vh - 68px))' }}
          >
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
