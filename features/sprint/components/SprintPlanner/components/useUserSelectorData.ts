import type { RegistryUserItem } from '@/lib/beerTrackerApi';

import { useEffect, useState } from 'react';

import { getUserByTrackerId, searchUsers } from '@/lib/beerTrackerApi';

function dedupeRegistryUsersByTrackerId(items: RegistryUserItem[]): RegistryUserItem[] {
  const seen = new Set<string>();
  const unique: RegistryUserItem[] = [];
  for (const item of items) {
    if (seen.has(item.trackerId)) {
      continue;
    }
    seen.add(item.trackerId);
    unique.push(item);
  }
  return unique;
}

const SEARCH_DEBOUNCE_MS = 250;
const MIN_SEARCH_LENGTH = 2;

export type UserSelectorSearchFn = (
  query: string,
  signal?: AbortSignal
) => Promise<RegistryUserItem[]>;

export function useUserSelectorSelectedUser(
  value: string,
  selectedPreview?: RegistryUserItem | null
) {
  const [selectedUser, setSelectedUser] = useState<RegistryUserItem | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  useEffect(() => {
    if (!value) {
      queueMicrotask(() => setSelectedUser(null));
      return;
    }
    if (selectedPreview?.trackerId === value) {
      queueMicrotask(() => {
        setSelectedUser(selectedPreview);
        setLoadingUser(false);
      });
      return;
    }
    let cancelled = false;
    queueMicrotask(() => setLoadingUser(true));
    getUserByTrackerId(value)
      .then((user) => {
        if (!cancelled) setSelectedUser(user ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoadingUser(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPreview, value]);

  return { loadingUser, selectedUser, setSelectedUser };
}

export function useUserSelectorSearch(
  isOpen: boolean,
  searchQuery: string,
  searchFn: UserSelectorSearchFn = searchUsers
) {
  const [results, setResults] = useState<RegistryUserItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || searchQuery.length < MIN_SEARCH_LENGTH) {
      queueMicrotask(() => setResults([]));
      return;
    }
    const controller = new AbortController();
    const debounceId = setTimeout(() => {
      setLoading(true);
      searchFn(searchQuery, controller.signal)
        .then((items) => {
          if (!controller.signal.aborted) {
            setResults(dedupeRegistryUsersByTrackerId(items));
          }
        })
        .catch(() => {
          /* aborted or network */
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(debounceId);
      controller.abort();
    };
  }, [isOpen, searchFn, searchQuery]);

  return { loading, results, setResults };
}
