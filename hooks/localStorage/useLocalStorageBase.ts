import { useEffect, useRef, useState } from 'react';

import { getFromStorage, saveToStorage } from './storagePrimitives';

/**
 * Универсальный хук для работы с простыми значениями в localStorage
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValueState] = useState<T>(() =>
    getFromStorage(key, defaultValue)
  );
  const isInitialMount = useRef(true);

  // Синхронизация с изменениями в других вкладках/окнах
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = JSON.parse(e.newValue) as T;
          setValueState(newValue);
        } catch (error) {
          console.error(`Ошибка при синхронизации из localStorage (${key}):`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  // Синхронизация внутри того же окна через кастомное событие
  useEffect(() => {
    const handleCustomStorageChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string; value: T }>;
      if (customEvent.detail?.key === key && customEvent.detail?.value !== undefined) {
        setValueState(customEvent.detail.value);
      }
    };

    window.addEventListener('localStorageChange', handleCustomStorageChange as EventListener);
    return () => window.removeEventListener('localStorageChange', handleCustomStorageChange as EventListener);
  }, [key]);

  useEffect(() => {
    if (isInitialMount.current) {
      const currentValue = getFromStorage(key, defaultValue);
      if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
        // Используем setTimeout для отложенного обновления состояния
        setTimeout(() => {
          setValueState(currentValue);
        }, 0);
      }
    }
  }, [key, defaultValue, value]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      return;
    }
    saveToStorage(key, value);
    window.dispatchEvent(new CustomEvent('localStorageChange', {
      detail: { key, value }
    }));
  }, [key, value]);

  const setValue = (newValue: T | ((prev: T) => T)) => {
    setValueState((prev) =>
      typeof newValue === 'function' ? (newValue as (prev: T) => T)(prev) : newValue
    );
  };

  return [value, setValue];
}
