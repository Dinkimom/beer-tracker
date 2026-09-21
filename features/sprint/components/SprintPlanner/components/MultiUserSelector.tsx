'use client';

import type { RegistryUserItem } from '@/lib/beerTrackerApi';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { getUserByTrackerId } from '@/lib/beerTrackerApi';

import {
  decodeMultiUserFieldValue,
  encodeMultiUserFieldValue,
  mergeLoadedMultiUsers,
  toggleMultiUserSelection,
} from './multiUserSelectorHelpers';
import { MultiUserSelectorSelectedChips } from './MultiUserSelectorSelectedChips';
import { UserSelectorClosedButton } from './UserSelectorClosedButton';
import { UserSelectorOpenPanel } from './UserSelectorOpenPanel';
import { useUserSelectorSearch } from './useUserSelectorData';
import { useUserSelectorDropdownLifecycle } from './useUserSelectorLifecycleHelpers';

interface MultiUserSelectorProps {
  className?: string;
  placeholder?: string;
  title?: string;
  value: string;
  onChange: (trackerIdsCsv: string) => void;
}

export function MultiUserSelector({
  className,
  placeholder,
  title,
  value,
  onChange,
}: MultiUserSelectorProps) {
  const { t } = useI18n();
  const resolvedPlaceholder = placeholder ?? t('common.notSelected');
  const selectedIds = decodeMultiUserFieldValue(value);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<RegistryUserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { loading, results, setResults } = useUserSelectorSearch(isOpen, searchQuery);

  useEffect(() => {
    const ids = decodeMultiUserFieldValue(value);
    let cancelled = false;
    if (ids.length === 0) {
      queueMicrotask(() => setSelectedUsers([]));
      return;
    }
    queueMicrotask(() => setLoadingUsers(true));
    Promise.all(ids.map((id) => getUserByTrackerId(id)))
      .then((loaded) => {
        if (!cancelled) {
          setSelectedUsers((prev) => mergeLoadedMultiUsers(prev, loaded, ids));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingUsers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useUserSelectorDropdownLifecycle({
    handleClickOutside,
    isOpen,
    setResults,
    setSearchQuery,
  });

  const emitIds = useCallback(
    (ids: string[]) => {
      onChange(encodeMultiUserFieldValue(ids));
    },
    [onChange]
  );

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setSearchQuery('');
    setResults([]);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [setResults]);

  const handleSelect = useCallback(
    (user: RegistryUserItem) => {
      const nextIds = toggleMultiUserSelection(selectedIds, user.trackerId);
      setSelectedUsers((prev) => {
        if (nextIds.includes(user.trackerId)) {
          return mergeLoadedMultiUsers(prev, [user], nextIds);
        }
        return prev.filter((u) => u.trackerId !== user.trackerId);
      });
      emitIds(nextIds);
      setSearchQuery('');
      setResults([]);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [emitIds, selectedIds, setResults]
  );

  const handleRemove = useCallback(
    (trackerId: string) => {
      emitIds(selectedIds.filter((id) => id !== trackerId));
      setSelectedUsers((prev) => prev.filter((u) => u.trackerId !== trackerId));
    },
    [emitIds, selectedIds]
  );

  const handleClearInput = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchQuery('');
    inputRef.current?.focus();
  }, []);

  let buttonText = resolvedPlaceholder;
  if (loadingUsers) {
    buttonText = 'Загрузка…';
  } else if (selectedIds.length > 0) {
    buttonText = `Выбрано: ${selectedIds.length}`;
  }

  return (
    <div ref={containerRef} className={className ? `relative ${className}` : 'relative'}>
      <MultiUserSelectorSelectedChips selectedUsers={selectedUsers} onRemove={handleRemove} />
      {isOpen ? (
        <UserSelectorOpenPanel
          inputRef={inputRef}
          loading={loading}
          placeholder={resolvedPlaceholder}
          results={results}
          searchQuery={searchQuery}
          selectedIds={selectedIds}
          title={title}
          value=""
          onClearInput={handleClearInput}
          onSearchQueryChange={setSearchQuery}
          onSelect={handleSelect}
        />
      ) : (
        <UserSelectorClosedButton
          buttonText={buttonText}
          selectedUser={null}
          title={title}
          value={selectedIds.length > 0 ? String(selectedIds.length) : ''}
          onOpen={handleOpen}
        />
      )}
    </div>
  );
}
