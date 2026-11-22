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
import {
  FLOATING_MENU_GLASS_SHELL,
  MENU_PANEL_PADDING,
  MENU_ROW,
  MENU_ROW_CHECK,
  MENU_ROW_STACK,
} from '@/features/context-menu/contextMenuClasses';
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
        // Стекло и строки — как у меню задачи и стеклянного CustomSelect: панель над доской не белая плашка.
        className={`relative flex min-w-[12rem] flex-col overflow-hidden outline-none ${FLOATING_MENU_GLASS_SHELL} ${OVERLAY_FLOATING_ANIMATION}`}
        collisionPadding={8}
        sideOffset={4}
        style={{ width: 'var(--radix-popover-trigger-width)', zIndex: menuZIndex ?? ZIndex.modalNested }}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={() => onDismiss?.()}
        onInteractOutside={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {loading && (
          <div className="px-3 py-2 text-sm text-ds-text-muted">{t('common.loading')}</div>
        )}
        {!loading && results.length === 0 && (
          <div className="px-3 py-2 text-sm text-ds-text-muted">
            {t('common.userSelector.empty')}
          </div>
        )}
        {!loading && results.length > 0 && (
          <div
            className={`max-h-48 overflow-y-auto overscroll-contain ${MENU_PANEL_PADDING} ${MENU_ROW_STACK}`}
            role="listbox"
          >
            {results.map((user) => {
              const isSelected = selectedIds
                ? selectedIds.includes(user.trackerId)
                : user.trackerId === value;
              return (
                <Button
                  key={user.trackerId}
                  aria-selected={isSelected}
                  className={MENU_ROW}
                  role="option"
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
                  {isSelected && <Icon className={`ml-auto ${MENU_ROW_CHECK}`} name="check" />}
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
