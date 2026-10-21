import { useEffect, useSyncExternalStore } from 'react';

import {
  clearYandexOAuthLocationArtifacts,
  parseYandexOAuthErrorSearch,
  parseYandexOAuthHash,
} from './fragment';

interface YandexOAuthClientTokenState {
  error: string;
  oauthHydrated: boolean;
  token: string;
}

const EMPTY_STATE: YandexOAuthClientTokenState = {
  error: '',
  oauthHydrated: false,
  token: '',
};

let clientSnapshot: YandexOAuthClientTokenState | undefined;

function getClientSnapshot(): YandexOAuthClientTokenState {
  if (clientSnapshot === undefined) {
    clientSnapshot = {
      error: parseYandexOAuthErrorSearch(window.location.search),
      oauthHydrated: true,
      token: parseYandexOAuthHash(window.location.hash),
    };
  }
  return clientSnapshot;
}

function getServerSnapshot(): YandexOAuthClientTokenState {
  return EMPTY_STATE;
}

function subscribe(_onStoreChange: () => void): () => void {
  return () => {};
}

/**
 * Yandex ID OAuth result after `/api/auth/yandex/callback` (token fragment / error query).
 * Snapshot is read on the client (render-safe peek); history is cleared in an effect.
 */
export function useYandexOAuthClientTokenState(): YandexOAuthClientTokenState {
  const state = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  useEffect(() => {
    clearYandexOAuthLocationArtifacts();
  }, []);

  return state;
}
