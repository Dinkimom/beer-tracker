'use client';

import type { CustomSelectOption } from '@/components/CustomSelect';
import type { RefObject } from 'react';

import * as Popover from '@radix-ui/react-popover';

import { CustomSelectOptionsList } from '@/components/CustomSelectOptionsList';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';

interface CustomSelectMenuProps<T extends string> {
  filteredOptions: CustomSelectOption<T>[];
  isSearchLoading: boolean;
  popoverStyle: React.CSSProperties;
  searchable: boolean;
  searchEmptyMessage: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchLoadingMessage: string;
  searchPlaceholder: string;
  searchQuery: string;
  value: T;
  onSearchQueryChange?: (query: string) => void;
  onSelect: (value: T) => void;
  renderOption?: (option: CustomSelectOption<T>, ctx: { isSelected: boolean }) => React.ReactNode;
  setSearchQuery: (query: string) => void;
}

export function CustomSelectMenu<T extends string>({
  filteredOptions,
  isSearchLoading,
  popoverStyle,
  renderOption,
  searchEmptyMessage,
  searchInputRef,
  searchLoadingMessage,
  searchPlaceholder,
  searchQuery,
  searchable,
  value,
  onSearchQueryChange,
  onSelect,
  setSearchQuery,
}: CustomSelectMenuProps<T>) {
  return (
    <Popover.Portal>
      <Popover.Content
        align="start"
        avoidCollisions
        className={`flex flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg outline-none dark:border-gray-600 dark:bg-gray-800 ${
          searchable ? 'max-h-72' : 'max-h-60 overflow-y-auto'
        } ${OVERLAY_FLOATING_ANIMATION}`}
        collisionPadding={12}
        side="bottom"
        sideOffset={4}
        style={popoverStyle}
        onOpenAutoFocus={(event) => {
          if (!searchable) return;
          event.preventDefault();
          requestAnimationFrame(() => {
            searchInputRef.current?.focus();
          });
        }}
      >
        {searchable ? (
          <div className="shrink-0 border-b border-gray-200 px-2 py-2 dark:border-gray-600">
            <input
              ref={searchInputRef}
              autoComplete="off"
              className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400"
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
        <CustomSelectOptionsList
          filteredOptions={filteredOptions}
          isSearchLoading={isSearchLoading}
          renderOption={renderOption}
          searchEmptyMessage={searchEmptyMessage}
          searchLoadingMessage={searchLoadingMessage}
          searchable={searchable}
          value={value}
          onSelect={onSelect}
        />
      </Popover.Content>
    </Popover.Portal>
  );
}
