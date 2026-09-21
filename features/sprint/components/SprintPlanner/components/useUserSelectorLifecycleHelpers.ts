import type { RegistryUserItem } from '@/lib/beerTrackerApi';

import { useCallback, useEffect } from 'react';

export function useUserSelectorDropdownLifecycle(input: {
  handleClickOutside: (event: MouseEvent) => void;
  isOpen: boolean;
  setResults: (value: RegistryUserItem[]) => void;
  setSearchQuery: (value: string) => void;
}): void {
  const { handleClickOutside, isOpen, setResults, setSearchQuery } = input;
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    queueMicrotask(() => {
      setSearchQuery('');
      setResults([]);
    });
  }, [isOpen, handleClickOutside, setResults, setSearchQuery]);
}

export function useUserSelectorHandlers(input: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (trackerId: string, user?: RegistryUserItem | null) => void;
  selectedUserDisplayName?: string;
  setIsOpen: (value: boolean) => void;
  setResults: (value: RegistryUserItem[]) => void;
  setSearchQuery: (value: string) => void;
  setSelectedUser: (user: RegistryUserItem | null) => void;
}) {
  const handleOpen = useCallback(() => {
    input.setIsOpen(true);
    input.setSearchQuery(input.selectedUserDisplayName ?? '');
    input.setResults([]);
    requestAnimationFrame(() => input.inputRef.current?.focus());
  }, [input]);

  const handleSelect = useCallback(
    (user: RegistryUserItem) => {
      input.onChange(user.trackerId, user);
      input.setSelectedUser(user);
      input.setIsOpen(false);
    },
    [input]
  );

  const handleClearSelection = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      input.onChange('', null);
      input.setSelectedUser(null);
      input.setIsOpen(false);
    },
    [input]
  );

  const handleClearInput = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    input.setSearchQuery('');
    input.inputRef.current?.focus();
  }, [input]);

  return { handleClearInput, handleClearSelection, handleOpen, handleSelect };
}
