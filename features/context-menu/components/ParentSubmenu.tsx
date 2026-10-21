'use client';

import type { Task, TaskParent } from '@/types';

import * as Popover from '@radix-ui/react-popover';
import { useId, useRef } from 'react';

import { Icon } from '@/components/Icon';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { ContextMenuRow } from '@/features/context-menu/components/ContextMenuRow';
import { ParentSubmenuOptionsList } from '@/features/context-menu/components/ParentSubmenuOptionsList';
import {
  FLOATING_MENU_GLASS_SHELL,
  MENU_PANEL_PADDING,
  MENU_ROW_ICON,
  MENU_SEPARATOR,
  MENU_SUBMENU_ALIGN_INSET_PX,
  MENU_SUBMENU_SIDE_OFFSET_PX,
  glassLensControlClass,
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

  const currentLabel = currentParent
    ? resolveContextMenuCurrentParentLabel(task, parentOptions)
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
        <ContextMenuRow
          disabled={isLoading}
          icon={<Icon aria-hidden className={MENU_ROW_ICON} name="issue-story" />}
          label={t('sprintPlanner.contextMenu.parentIssue')}
          submenuOpen={isOpen}
          value={currentParent?.key ?? currentLabel}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          alignOffset={-MENU_SUBMENU_ALIGN_INSET_PX}
          className={`relative flex max-h-[320px] w-[300px] max-w-[calc(100vw-40px)] flex-col overflow-hidden outline-none ${MENU_PANEL_PADDING} ${FLOATING_MENU_GLASS_SHELL} ${ZIndex.class('submenu')} ${OVERLAY_FLOATING_ANIMATION}`}
          collisionPadding={10}
          data-submenu="true"
          side="right"
          sideOffset={MENU_SUBMENU_SIDE_OFFSET_PX}
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
          <div className="shrink-0">
            <input
              ref={searchInputRef}
              className={`h-8 w-full rounded-md px-2 text-sm text-gray-900 outline-none placeholder:text-gray-500 dark:text-gray-100 dark:placeholder:text-gray-400 ${glassLensControlClass()}`}
              disabled={isLoading}
              id={searchInputId}
              placeholder={t('sprintPlanner.contextMenu.parentSearchPlaceholder')}
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearchQueryChange(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className={MENU_SEPARATOR} role="separator" />
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
