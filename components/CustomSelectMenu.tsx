'use client';

import type { CustomSelectOption } from '@/components/CustomSelect';
import type { RefObject } from 'react';

import * as Popover from '@radix-ui/react-popover';

import { CustomSelectOptionsList } from '@/components/CustomSelectOptionsList';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import {
  FLOATING_MENU_GLASS_SHELL,
  glassLensControlClass,
  MENU_SEPARATOR,
} from '@/features/context-menu/contextMenuClasses';

/**
 * Стекло — как меню задачи: подложка в `::before`, поэтому скроллит список, а не оболочка;
 * поиск — линза в поле панели, под ним линия на всю ширину.
 */
const MENU_CLASSES = {
  glass: {
    content: `relative flex flex-col overflow-hidden outline-none ${FLOATING_MENU_GLASS_SHELL}`,
    search: `h-8 w-full rounded-md px-2 text-sm text-gray-900 outline-none placeholder:text-gray-500 dark:text-gray-100 dark:placeholder:text-gray-400 ${glassLensControlClass()}`,
    searchWrap: 'shrink-0 px-1 pt-1',
  },
  solid: {
    content:
      'flex flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg outline-none dark:border-gray-600 dark:bg-gray-800',
    search:
      'w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400',
    searchWrap: 'shrink-0 border-b border-gray-200 px-2 py-2 dark:border-gray-600',
  },
} as const;

interface CustomSelectMenuProps<T extends string> {
  align?: 'center' | 'end' | 'start';
  filteredOptions: CustomSelectOption<T>[];
  isSearchLoading: boolean;
  popoverStyle: React.CSSProperties;
  searchable: boolean;
  searchEmptyMessage: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchLoadingMessage: string;
  searchPlaceholder: string;
  searchQuery: string;
  surface?: 'glass' | 'solid';
  value: T;
  onCloseAutoFocus?: (event: Event) => void;
  onPointerDown?: (event: React.PointerEvent) => void;
  onSearchQueryChange?: (query: string) => void;
  onSelect: (value: T) => void;
  renderOption?: (option: CustomSelectOption<T>, ctx: { isSelected: boolean }) => React.ReactNode;
  setSearchQuery: (query: string) => void;
}

export function CustomSelectMenu<T extends string>({
  align = 'start',
  filteredOptions,
  isSearchLoading,
  onCloseAutoFocus,
  onPointerDown,
  popoverStyle,
  renderOption,
  searchEmptyMessage,
  searchInputRef,
  searchLoadingMessage,
  searchPlaceholder,
  searchQuery,
  searchable,
  surface = 'solid',
  value,
  onSearchQueryChange,
  onSelect,
  setSearchQuery,
}: CustomSelectMenuProps<T>) {
  const isGlass = surface === 'glass';
  const classes = MENU_CLASSES[surface];
  const scrollsShell = !searchable && !isGlass;
  return (
    <Popover.Portal>
      <Popover.Content
        align={align}
        avoidCollisions
        className={`${classes.content} ${searchable ? 'max-h-72' : 'max-h-60'} ${
          scrollsShell ? '!overflow-y-auto' : ''
        } ${OVERLAY_FLOATING_ANIMATION}`}
        collisionPadding={12}
        side="bottom"
        sideOffset={4}
        style={popoverStyle}
        onCloseAutoFocus={onCloseAutoFocus}
        onOpenAutoFocus={(event) => {
          if (!searchable) return;
          event.preventDefault();
          requestAnimationFrame(() => {
            searchInputRef.current?.focus();
          });
        }}
        onPointerDown={onPointerDown}
      >
        {searchable ? (
          <div className={classes.searchWrap}>
            <input
              ref={searchInputRef}
              autoComplete="off"
              className={classes.search}
              placeholder={searchPlaceholder}
              type="search"
              value={searchQuery}
              onChange={(e) => {
                const next = e.target.value;
                setSearchQuery(next);
                onSearchQueryChange?.(next);
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
            />
          </div>
        ) : null}
        {searchable && isGlass ? (
          <div className="px-1">
            <div className={MENU_SEPARATOR} role="separator" />
          </div>
        ) : null}
        <CustomSelectOptionsList
          filteredOptions={filteredOptions}
          isSearchLoading={isSearchLoading}
          renderOption={renderOption}
          searchEmptyMessage={searchEmptyMessage}
          searchLoadingMessage={searchLoadingMessage}
          searchable={searchable}
          surface={surface}
          value={value}
          onSelect={onSelect}
        />
      </Popover.Content>
    </Popover.Portal>
  );
}
