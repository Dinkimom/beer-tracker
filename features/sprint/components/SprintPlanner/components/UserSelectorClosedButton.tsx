'use client';

import type { RegistryUserItem } from '@/lib/beerTrackerApi';
import type { MouseEvent } from 'react';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

import { getUserSelectorInitials } from './userSelectorDisplayHelpers';

interface UserSelectorClosedButtonProps {
  allowClear?: boolean;
  buttonText: string;
  compact?: boolean;
  disabled?: boolean;
  selectedUser: RegistryUserItem | null;
  title?: string;
  value: string;
  onClear?: (event: MouseEvent) => void;
  onOpen: () => void;
}

function closedFieldClassName(compact: boolean, disabled: boolean): string {
  const height = compact ? 'h-9' : 'h-[38px]';
  const disabledClass = disabled ? 'pointer-events-none opacity-50' : '';
  return `flex w-full items-center overflow-hidden rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 ${height} ${disabledClass}`;
}

function closedPlaceholderClassName(hasValue: boolean): string {
  if (hasValue) {
    return 'min-w-0 truncate';
  }
  return 'min-w-0 truncate text-gray-500 dark:text-gray-400';
}

export function UserSelectorClosedButton({
  allowClear = false,
  buttonText,
  compact = false,
  disabled = false,
  onClear,
  onOpen,
  selectedUser,
  title,
  value,
}: UserSelectorClosedButtonProps) {
  const { t } = useI18n();
  const showClear = Boolean(allowClear && value && onClear && !disabled);

  return (
    <div className={closedFieldClassName(compact, Boolean(disabled))}>
      <button
        className="flex min-h-0 min-w-0 flex-1 cursor-pointer items-center gap-2 overflow-hidden px-3 py-0 text-left"
        disabled={disabled}
        title={title}
        type="button"
        onClick={onOpen}
      >
        {selectedUser ? (
          <>
            <Avatar
              avatarUrl={selectedUser.avatarUrl}
              className="shrink-0"
              initials={getUserSelectorInitials(selectedUser.displayName)}
              size={compact ? 'xs' : 'sm'}
            />
            <span className="min-w-0 truncate">{selectedUser.displayName}</span>
          </>
        ) : (
          <span className={closedPlaceholderClassName(Boolean(value))}>{buttonText}</span>
        )}
      </button>
      {showClear ? (
        <button
          aria-label={t('common.userSelector.resetSelectionAria')}
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-ds-text-muted hover:bg-gray-200/90 dark:hover:bg-white/[0.08]"
          title={t('common.userSelector.clearTitle')}
          type="button"
          onClick={onClear}
        >
          <Icon className="h-3.5 w-3.5" name="x" />
        </button>
      ) : null}
      <button
        aria-hidden
        className="flex h-full shrink-0 cursor-pointer items-center py-0 pl-0.5 pr-3"
        disabled={disabled}
        tabIndex={-1}
        type="button"
        onClick={onOpen}
      >
        <Icon className="h-3 w-3 shrink-0" name="chevron-down" />
      </button>
    </div>
  );
}
