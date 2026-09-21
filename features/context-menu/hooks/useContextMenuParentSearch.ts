'use client';

import type { TaskParent } from '@/types';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  contextMenuParentMatchesQuery,
  hasLocalContextMenuParentMatch,
  taskParentFromIssueSearchItem,
} from '@/features/context-menu/utils/buildContextMenuParentOptions';
import { useDebouncedCallback } from '@/hooks/usePerformance';
import { searchIssues } from '@/lib/api/issues';

const PARENT_SEARCH_DEBOUNCE_MS = 300;

interface UseContextMenuParentSearchParams {
  boardId: number | null;
  isOpen: boolean;
  parentOptions: TaskParent[];
}

export function useContextMenuParentSearch({
  boardId,
  isOpen,
  parentOptions,
}: UseContextMenuParentSearchParams) {
  const [searchQuery, setSearchQuery] = useState('');
  const [remoteParents, setRemoteParents] = useState<TaskParent[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      return;
    }
    setSearchQuery('');
    setRemoteParents([]);
    setIsSearching(false);
  }, [isOpen]);

  const localFiltered = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return parentOptions;
    }
    return parentOptions.filter((parent) => contextMenuParentMatchesQuery(parent, trimmed));
  }, [parentOptions, searchQuery]);

  const performRemoteSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || boardId == null || hasLocalContextMenuParentMatch(parentOptions, trimmed)) {
        setRemoteParents([]);
        setIsSearching(false);
        return;
      }
      try {
        const items = await searchIssues(trimmed, boardId, { parentCandidates: true });
        setRemoteParents(items.map(taskParentFromIssueSearchItem));
      } finally {
        setIsSearching(false);
      }
    },
    [boardId, parentOptions]
  );

  const debouncedRemoteSearch = useDebouncedCallback(
    performRemoteSearch,
    PARENT_SEARCH_DEBOUNCE_MS,
    {
      leading: false,
      trailing: true,
    }
  );

  useEffect(() => () => debouncedRemoteSearch.cancel(), [debouncedRemoteSearch]);

  const handleSearchQueryChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      const trimmed = value.trim();
      if (!trimmed || boardId == null) {
        debouncedRemoteSearch.cancel();
        setRemoteParents([]);
        setIsSearching(false);
        return;
      }
      if (hasLocalContextMenuParentMatch(parentOptions, trimmed)) {
        debouncedRemoteSearch.cancel();
        setRemoteParents([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      debouncedRemoteSearch(trimmed);
    },
    [boardId, debouncedRemoteSearch, parentOptions]
  );

  const visibleParents = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return parentOptions;
    }
    if (localFiltered.length > 0) {
      return localFiltered;
    }
    return remoteParents;
  }, [localFiltered, parentOptions, remoteParents, searchQuery]);

  return {
    handleSearchQueryChange,
    isSearching,
    searchQuery,
    visibleParents,
  };
}
