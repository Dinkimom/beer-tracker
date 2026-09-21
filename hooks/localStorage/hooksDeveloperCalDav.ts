import type {
  DeveloperCalDavCredentials,
  DeveloperCalDavCredentialsMap,
} from '@/lib/calendar/developerCalDavCredentialsTypes';

import { useCallback, useEffect, useState } from 'react';

import {
  DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY,
  readDeveloperCalDavCredentialsStore,
  removeDeveloperCalDavCredentials,
  writeDeveloperCalDavCredentials,
  writeDeveloperCalDavCredentialsStore,
} from '@/lib/calendar/developerCalDavCredentialsStorage';

function readStoreSnapshot(): DeveloperCalDavCredentialsMap {
  return readDeveloperCalDavCredentialsStore();
}

/**
 * Карта CalDAV-учёток по id исполнителя (localStorage).
 */
function useDeveloperCalDavCredentialsMapStorage(): [
  DeveloperCalDavCredentialsMap,
  (
    updater:
      | DeveloperCalDavCredentialsMap
      | ((prev: DeveloperCalDavCredentialsMap) => DeveloperCalDavCredentialsMap)
  ) => void,
] {
  const [store, setStoreState] = useState<DeveloperCalDavCredentialsMap>(readStoreSnapshot);

  useEffect(() => {
    const syncFromStorage = () => {
      setStoreState(readStoreSnapshot());
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY) {
        syncFromStorage();
      }
    };

    const handleCustomStorageChange = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (detail?.key === DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY) {
        syncFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageChange', handleCustomStorageChange as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange as EventListener);
    };
  }, []);

  const setStore = useCallback(
    (
      updater:
        | DeveloperCalDavCredentialsMap
        | ((prev: DeveloperCalDavCredentialsMap) => DeveloperCalDavCredentialsMap)
    ) => {
      setStoreState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        writeDeveloperCalDavCredentialsStore(next);
        return next;
      });
    },
    []
  );

  return [store, setStore];
}

/**
 * Есть ли в браузере хотя бы одна сохранённая CalDAV-учётка.
 */
export function useHasDeveloperCalDavCredentials(): boolean {
  const [store] = useDeveloperCalDavCredentialsMapStorage();
  return Object.keys(store).length > 0;
}

/**
 * CalDAV-учётка одного исполнителя (localStorage).
 */
export function useDeveloperCalDavCredentialsStorage(developerId: string): [
  DeveloperCalDavCredentials | null,
  (credentials: DeveloperCalDavCredentials | null) => void,
] {
  const id = developerId.trim();
  const [store, setStore] = useDeveloperCalDavCredentialsMapStorage();

  const setCredentials = useCallback(
    (credentials: DeveloperCalDavCredentials | null) => {
      if (!id) {
        return;
      }
      if (credentials == null) {
        removeDeveloperCalDavCredentials(id);
        setStore((prev) => {
          if (!(id in prev)) {
            return prev;
          }
          const next = { ...prev };
          delete next[id];
          return next;
        });
        return;
      }
      writeDeveloperCalDavCredentials(id, credentials);
      setStore((prev) => ({
        ...prev,
        [id]: {
          ...credentials,
          updatedAt: new Date().toISOString(),
        },
      }));
    },
    [id, setStore]
  );

  return [id ? (store[id] ?? null) : null, setCredentials];
}
