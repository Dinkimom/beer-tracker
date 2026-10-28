'use client';

import type { RegistryUserItem } from '@/lib/beerTrackerApi';

import { useRef, useState } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { usePopoverDismiss } from '@/hooks/usePopoverDismiss';

import { UserSelectorClosedButton } from './UserSelectorClosedButton';
import { UserSelectorOpenPanel } from './UserSelectorOpenPanel';
import {
  useUserSelectorSearch,
  useUserSelectorSelectedUser,
  type UserSelectorSearchFn,
} from './useUserSelectorData';
import {
  useUserSelectorDropdownLifecycle,
  useUserSelectorHandlers,
} from './useUserSelectorLifecycleHelpers';

interface UserSelectorProps {
  allowClear?: boolean;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  menuZIndex?: number;
  placeholder?: string;
  searchFn?: UserSelectorSearchFn;
  selectedPreview?: RegistryUserItem | null;
  title?: string;
  value: string;
  onChange: (trackerId: string, user?: RegistryUserItem | null) => void;
}

export function UserSelector({
  allowClear = false,
  className,
  compact = false,
  disabled = false,
  menuZIndex,
  placeholder,
  searchFn,
  selectedPreview,
  title,
  value,
  onChange,
}: UserSelectorProps) {
  const { t } = useI18n();
  const resolvedPlaceholder = placeholder ?? t('common.notSelected');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { loadingUser, selectedUser, setSelectedUser } = useUserSelectorSelectedUser(
    value,
    selectedPreview
  );
  const { loading, results, setResults } = useUserSelectorSearch(isOpen, searchQuery, searchFn);

  usePopoverDismiss(() => setIsOpen(false), {
    enabled: isOpen,
    event: 'mousedown',
    refs: [containerRef, resultsRef],
  });

  useUserSelectorDropdownLifecycle({
    isOpen,
    setResults,
    setSearchQuery,
  });

  const { handleClearInput, handleClearSelection, handleOpen, handleSelect } =
    useUserSelectorHandlers({
      inputRef,
      onChange,
      selectedUserDisplayName: selectedUser?.displayName,
      setIsOpen,
      setResults,
      setSearchQuery,
      setSelectedUser,
    });

  const buttonText = loadingUser
    ? t('common.loading')
    : selectedUser?.displayName || value || resolvedPlaceholder;

  return (
    <div ref={containerRef} className={className ? `relative ${className}` : 'relative'}>
      {isOpen && !disabled ? (
        <UserSelectorOpenPanel
          compact={compact}
          inputRef={inputRef}
          loading={loading}
          menuZIndex={menuZIndex}
          placeholder={resolvedPlaceholder}
          results={results}
          resultsRef={resultsRef}
          searchQuery={searchQuery}
          title={title}
          value={value}
          onClearInput={handleClearInput}
          onSearchQueryChange={setSearchQuery}
          onSelect={handleSelect}
        />
      ) : (
        <UserSelectorClosedButton
          allowClear={allowClear}
          buttonText={buttonText}
          compact={compact}
          disabled={disabled}
          selectedUser={selectedUser}
          title={title}
          value={value}
          onClear={handleClearSelection}
          onOpen={handleOpen}
        />
      )}
    </div>
  );
}
