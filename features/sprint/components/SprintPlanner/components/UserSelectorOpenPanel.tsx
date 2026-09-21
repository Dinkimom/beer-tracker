'use client';

import type { RegistryUserItem } from '@/lib/beerTrackerApi';
import type { CSSProperties, RefObject } from 'react';

import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';

import { getInitials } from './userSelectorDisplayHelpers';

const MIN_SEARCH_LENGTH = 2;

interface UserSelectorOpenPanelProps {
  compact?: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  loading: boolean;
  menuZIndex?: number;
  placeholder?: string;
  results: RegistryUserItem[];
  resultsRef?: RefObject<HTMLDivElement | null>;
  searchQuery: string;
  /** When set, marks any of these tracker ids as selected (multi-select). */
  selectedIds?: string[];
  title?: string;
  value: string;
  onClearInput: (e: React.MouseEvent) => void;
  onSearchQueryChange: (value: string) => void;
  onSelect: (user: RegistryUserItem) => void;
}

function resolveUserSelectorResultsStyle(input: {
  menuZIndex?: number;
  portalRect: DOMRect | null;
  usePortal: boolean;
}): CSSProperties {
  if (input.usePortal && input.portalRect) {
    return {
      left: input.portalRect.left,
      top: input.portalRect.bottom + 4,
      width: input.portalRect.width,
      zIndex: input.menuZIndex,
    };
  }
  return { zIndex: input.menuZIndex ?? ZIndex.dropdownContent };
}

export function UserSelectorOpenPanel({
  compact = false,
  inputRef,
  loading,
  menuZIndex,
  onClearInput,
  onSearchQueryChange,
  onSelect,
  placeholder,
  results,
  resultsRef,
  searchQuery,
  selectedIds,
  title,
  value,
}: UserSelectorOpenPanelProps) {
  const { t } = useI18n();
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const showResults = searchQuery.length >= MIN_SEARCH_LENGTH;
  const usePortal = menuZIndex != null;
  const [portalRect, setPortalRect] = useState<DOMRect | null>(null);
  const searchPlaceholder = placeholder ?? t('common.userSelector.searchPlaceholder');
  const clearTitle = t('common.userSelector.clearTitle');

  useLayoutEffect(() => {
    if (!usePortal || !showResults) {
      return;
    }
    const el = inputWrapRef.current;
    if (!el) {
      return;
    }
    const update = () => setPortalRect(el.getBoundingClientRect());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [showResults, usePortal]);

  const resultsNode =
    showResults && (!usePortal || portalRect) ? (
      <div
        ref={resultsRef}
        className={
          usePortal
            ? 'fixed min-w-[12rem] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800'
            : 'absolute top-full left-0 right-0 z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800'
        }
        style={resolveUserSelectorResultsStyle({ menuZIndex, portalRect, usePortal })}
      >
        {loading && (
          <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
        )}
        {!loading && results.length === 0 && (
          <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
            {t('common.userSelector.empty')}
          </div>
        )}
        {!loading && results.length > 0 && (
          <div className="max-h-48 overflow-y-auto">
            {results.map((user) => {
              const isSelected = selectedIds
                ? selectedIds.includes(user.trackerId)
                : user.trackerId === value;
              return (
                <Button
                  key={user.trackerId}
                  className={`h-auto min-h-0 w-full !rounded-none border-0 !justify-start !gap-3 !px-3 !py-2 text-left text-sm font-medium shadow-none ${
                    isSelected
                      ? 'cursor-pointer !bg-blue-50 !text-blue-700 hover:!bg-blue-50 dark:!bg-blue-900/30 dark:!text-blue-300 dark:hover:!bg-blue-900/30'
                      : 'cursor-pointer text-gray-700 hover:!bg-gray-50 dark:text-gray-300 dark:hover:!bg-gray-700'
                  }`}
                  type="button"
                  variant="ghost"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onSelect(user);
                  }}
                >
                  <Avatar
                    avatarUrl={user.avatarUrl}
                    initials={getInitials(user.displayName)}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {user.displayName}
                    {user.email && (
                      <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                        {user.email}
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <Icon className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" name="check" />
                  )}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    ) : null;

  return (
    <>
      <div
        ref={inputWrapRef}
        className={
          compact
            ? 'flex h-9 min-h-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-0 text-sm focus-within:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus-within:border-blue-400'
            : 'flex h-[38px] min-h-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-0 text-sm focus-within:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus-within:border-blue-400'
        }
        style={{ zIndex: ZIndex.dropdownContent + 1 }}
      >
        <input
          ref={inputRef}
          className="min-w-0 flex-1 bg-transparent text-gray-900 outline-none placeholder-gray-500 dark:text-gray-100"
          placeholder={searchPlaceholder}
          title={title}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
        />
        {searchQuery ? (
          <HeaderIconButton
            aria-label={clearTitle}
            className="!h-7 !w-7 shrink-0"
            title={clearTitle}
            type="button"
            onClick={onClearInput}
          >
            <Icon className="h-4 w-4" name="x" />
          </HeaderIconButton>
        ) : null}
      </div>
      {usePortal && resultsNode ? createPortal(resultsNode, document.body) : resultsNode}
    </>
  );
}
