import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';

import { saveToStorage } from './storagePrimitives';

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Читает значение ключа; повторный разбор только при смене сырой строки (стабильный снапшот). */
function createSnapshotReader<T>(key: string, fallback: T): () => T {
  let cachedRaw: string | null = null;
  let cachedValue = fallback;
  return () => {
    const raw = readRaw(key);
    if (raw === cachedRaw) return cachedValue;
    cachedRaw = raw;
    try {
      cachedValue = raw === null ? fallback : (JSON.parse(raw) as T);
    } catch (error) {
      console.error(`Ошибка при загрузке из localStorage (${key}):`, error);
      cachedValue = fallback;
    }
    return cachedValue;
  };
}

/**
 * Универсальный хук для работы с простыми значениями в localStorage.
 * Источник правды — сам localStorage: все потребители ключа видят одно значение,
 * запись происходит только через setter (монтирование ничего не пишет).
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Первый default фиксируем: снапшот должен быть стабильным, а вызывающие часто передают литерал.
  const [fallback] = useState(defaultValue);

  const getSnapshot = useMemo(() => createSnapshotReader(key, fallback), [key, fallback]);

  const subscribe = useCallback(
    (onChange: () => void) => {
      // `storage` — другие вкладки, `localStorageChange` — это же окно
      const handleStorage = (e: StorageEvent) => {
        if (e.key === key) onChange();
      };
      const handleCustom = (e: Event) => {
        if ((e as CustomEvent<{ key: string }>).detail?.key === key) onChange();
      };
      window.addEventListener('storage', handleStorage);
      window.addEventListener('localStorageChange', handleCustom);
      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('localStorageChange', handleCustom);
      };
    },
    [key]
  );

  const value = useSyncExternalStore(subscribe, getSnapshot, () => fallback);

  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const next =
        typeof newValue === 'function' ? (newValue as (prev: T) => T)(getSnapshot()) : newValue;
      saveToStorage(key, next);
      window.dispatchEvent(new CustomEvent('localStorageChange', { detail: { key, value: next } }));
    },
    [key, getSnapshot]
  );

  return [value, setValue];
}
