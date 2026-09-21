'use client';

import type { QuickAddIssueSearchResult, QuickAddMode } from '../types';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDebouncedCallback } from '@/hooks/usePerformance';
import { searchIssues } from '@/lib/api/issues';

import { filterAndSortQuickAddIssueResults } from '../quickAddMenuIssueSearch';

const ISSUE_SEARCH_DEBOUNCE_MS = 300;

interface UseQuickAddIssueSearchParams {
  boardId: number;
  excludedIssueKeys: ReadonlySet<string>;
  mode: QuickAddMode;
  parentCandidates?: boolean;
}

export function useQuickAddIssueSearch({
  boardId,
  excludedIssueKeys,
  mode,
  parentCandidates = false,
}: UseQuickAddIssueSearchParams) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<QuickAddIssueSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const performSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || boardId <= 0) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      try {
        const items = await searchIssues(
          trimmed,
          boardId,
          parentCandidates ? { parentCandidates: true } : undefined
        );
        setSearchResults(items);
      } finally {
        setIsSearching(false);
      }
    },
    [boardId, parentCandidates]
  );

  const debouncedSearch = useDebouncedCallback(performSearch, ISSUE_SEARCH_DEBOUNCE_MS, {
    leading: false,
    trailing: true,
  });

  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  useEffect(() => {
    if (mode !== 'existing') {
      debouncedSearch.cancel();
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [debouncedSearch, mode]);

  const handleSearchQueryChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      const trimmed = value.trim();
      if (!trimmed) {
        debouncedSearch.cancel();
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      debouncedSearch(trimmed);
    },
    [debouncedSearch]
  );

  const visibleResults = useMemo(
    () => filterAndSortQuickAddIssueResults(searchResults, excludedIssueKeys),
    [excludedIssueKeys, searchResults]
  );

  const showResultsPanel = isSearching || searchQuery.trim() !== '';

  return {
    handleSearchQueryChange,
    isSearching,
    searchQuery,
    showResultsPanel,
    visibleResults,
  };
}
