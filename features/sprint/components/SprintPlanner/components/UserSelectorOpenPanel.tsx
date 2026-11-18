'use client';

import type { RegistryUserItem } from '@/lib/beerTrackerApi';
import type { RefObject } from 'react';

import * as Popover from '@radix-ui/react-popover';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { getInitials } from '@/utils/displayUtils';


const MIN_SEARCH_LENGTH = 2;

interface UserSelectorOpenPanelProps {
  compact?: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  loading: boolean;
  /**
   * Слой списка результатов. По умолчанию — поверх модального окна и поповеров доски;
   * задают, только когда селектор стоит в слое выше (меню быстрого добавления).
   */
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
  /** Escape при открытом списке: закрыть селектор, а не окно под ним. */
  onDismiss?: () => void;
  onSearchQueryChange: (value: string) => void;
  onSelect: (user: RegistryUserItem) => void;
}

export function UserSelectorOpenPanel({
  compact = false,
  inputRef,
  loading,
  menuZIndex,
  onClearInput,
  onDismiss,
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
  const showResults = searchQuery.length >= MIN_SEARCH_LENGTH;
  const searchPlaceholder = placeholder ?? t('common.userSelector.searchPlaceholder');
  const clearTitle = t('common.userSelector.clearTitle');

  // Список — поповер у поля поиска: фокус остаётся в поле, клик мимо разбирает селектор-родитель.
  const resultsNode = (
    <Popover.Portal>
      <Popover.Content
        ref={resultsRef}
        align="start"
        className={`min-w-[12rem] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg outline-none dark:border-gray-700 dark:bg-gray-800 ${OVERLAY_FLOATING_ANIMATION}`}
        collisionPadding={8}
        sideOffset={4}
        style={{ width: 'var(--radix-popover-trigger-width)', zIndex: menuZIndex ?? ZIndex.modalNested }}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={() => onDismiss?.()}
        onInteractOutside={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
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
                  <span className="min-w-0 flex-1 truncate">{user.displayName}</span>
                  {isSelected && (
                    <Icon className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" name="check" />
                  )}
                </Button>
              );
            })}
          </div>
        )}
      </Popover.Content>
    </Popover.Portal>
  );

  return (
    <Popover.Root open={showResults}>
      <Popover.Anchor asChild>
        <div
          className={
            compact
              ? 'flex h-9 min-h-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-0 text-sm focus-within:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus-within:border-blue-400'
              : 'flex h-[38px] min-h-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-0 text-sm focus-within:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus-within:border-blue-400'
          }
          style={{ zIndex: ZIndex.dropdownContent + 1 }}
        >
          <input
            ref={inputRef}
            aria-label={title}
            className="min-w-0 flex-1 bg-transparent text-gray-900 outline-none placeholder-gray-500 dark:text-gray-100"
            placeholder={searchPlaceholder}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
          />
          {searchQuery ? (
            <HeaderIconButton
              aria-label={clearTitle}
              className="!h-7 !w-7 shrink-0"
              type="button"
              onClick={onClearInput}
            >
              <Icon className="h-4 w-4" name="x" />
            </HeaderIconButton>
          ) : null}
        </div>
      </Popover.Anchor>
      {resultsNode}
    </Popover.Root>
  );
}
