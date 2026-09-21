import { useEffect, useRef, useState } from 'react';

import { getFromStorage, saveToStorage } from './storagePrimitives';

/**
 * Число в localStorage с debounce записи (ресайзы ширины колонок).
 * Синхронизация между вкладками (`storage`) и внутри окна (`localStorageChange`).
 */
export function useDebouncedNumericLocalStorage(
  key: string,
  defaultValue: number,
  debounceMs = 300
): [number, (value: number | ((prev: number) => number)) => void] {
  const [value, setValueState] = useState<number>(() =>
    getFromStorage(key, defaultValue)
  );
  const isInitialMount = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = JSON.parse(e.newValue) as number;
          setValueState(newValue);
        } catch (error) {
          console.error(`Ошибка при синхронизации из localStorage (${key}):`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  useEffect(() => {
    const handleCustomStorageChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string; value: number }>;
      if (customEvent.detail?.key === key && customEvent.detail?.value !== undefined) {
        setValueState((prev) =>
          prev === customEvent.detail!.value ? prev : customEvent.detail!.value
        );
      }
    };

    window.addEventListener('localStorageChange', handleCustomStorageChange as EventListener);
    return () => window.removeEventListener('localStorageChange', handleCustomStorageChange as EventListener);
  }, [key]);

  useEffect(() => {
    if (isInitialMount.current) {
      const currentValue = getFromStorage(key, defaultValue);
      if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
        setTimeout(() => setValueState(currentValue), 0);
      }
    }
  }, [key, defaultValue, value]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveToStorage(key, value);
      window.dispatchEvent(new CustomEvent('localStorageChange', {
        detail: { key, value },
      }));
    }, debounceMs);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [key, value, debounceMs]);

  const setValue = (newValue: number | ((prev: number) => number)) => {
    setValueState((prev) =>
      typeof newValue === 'function' ? (newValue as (prev: number) => number)(prev) : newValue
    );
  };

  return [value, setValue];
}
