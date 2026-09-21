'use client';

import type { CustomSelectOption } from '@/components/CustomSelect';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDebouncedCallback } from '@/hooks/usePerformance';
import { searchIssues } from '@/lib/api/issues';

import {
  formatQuickAddParentOptionLabel,
  hasLocalParentSelectMatch,
  mergeParentSelectOptions,
} from '../quickAddParentSelectHelpers';

const PARENT_SEARCH_DEBOUNCE_MS = 300;

interface UseQuickAddParentSelectParams {
  boardId: number;
  parentKey: string;
  parentSelectOptions: CustomSelectOption<string>[];
}

export function useQuickAddParentSelect({
  boardId,
  parentKey,
  parentSelectOptions,
}: UseQuickAddParentSelectParams) {
  const [remoteByKey, setRemoteByKey] = useState(
    () => new Map<string, CustomSelectOption<string>>()
  );
  const [activeRemoteKeys, setActiveRemoteKeys] = useState<string[]>([]);
  const [isParentSearching, setIsParentSearching] = useState(false);

  const performParentSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || hasLocalParentSelectMatch(parentSelectOptions, trimmed)) {
        setActiveRemoteKeys([]);
        setIsParentSearching(false);
        return;
      }
      try {
        const items = await searchIssues(trimmed, boardId, { parentCandidates: true });
        const keys: string[] = [];
        setRemoteByKey((prev) => {
          const next = new Map(prev);
          for (const item of items) {
            const option: CustomSelectOption<string> = {
              label: formatQuickAddParentOptionLabel({
                display: item.summary,
                id: item.key,
                key: item.key,
              }),
              value: item.key,
            };
            next.set(item.key, option);
            keys.push(item.key);
          }
          return next;
        });
        setActiveRemoteKeys(keys);
      } finally {
        setIsParentSearching(false);
      }
    },
    [boardId, parentSelectOptions]
  );

  const debouncedParentSearch = useDebouncedCallback(
    performParentSearch,
    PARENT_SEARCH_DEBOUNCE_MS,
    {
      leading: false,
      trailing: true,
    }
  );

  useEffect(() => () => debouncedParentSearch.cancel(), [debouncedParentSearch]);

  const handleParentSearchQueryChange = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        debouncedParentSearch.cancel();
        setActiveRemoteKeys([]);
        setIsParentSearching(false);
        return;
      }
      if (hasLocalParentSelectMatch(parentSelectOptions, trimmed)) {
        debouncedParentSearch.cancel();
        setActiveRemoteKeys([]);
        setIsParentSearching(false);
        return;
      }
      setIsParentSearching(true);
      debouncedParentSearch(trimmed);
    },
    [debouncedParentSearch, parentSelectOptions]
  );

  const options = useMemo(
    () =>
      mergeParentSelectOptions({
        activeRemoteKeys,
        baseOptions: parentSelectOptions,
        parentKey,
        remoteByKey,
      }),
    [activeRemoteKeys, parentKey, parentSelectOptions, remoteByKey]
  );

  return {
    handleParentSearchQueryChange,
    isParentSearching,
    parentSelectOptions: options,
  };
}
