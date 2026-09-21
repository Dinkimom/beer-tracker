import { STORAGE_KEYS } from './localStorage/storageKeys';
import { useDebouncedNumericLocalStorage } from './localStorage/useDebouncedNumericLocalStorage';
import { useLocalStorage as useLocalStorageBase } from './localStorage/useLocalStorageBase';

export { useLocalStorageBase as useLocalStorage };

export * from './localStorage/hooksOccupancyEpicQuarterly';
export * from './localStorage/hooksSelectionThemeAndSync';
export * from './localStorage/hooksSidebarAndDevelopers';
export * from './localStorage/hooksDeveloperCalDav';

export function useSidebarWidthStorage(
  defaultValue: number = 320
): [number, (value: number | ((prev: number) => number)) => void] {
  return useDebouncedNumericLocalStorage(STORAGE_KEYS.SIDEBAR_WIDTH, defaultValue);
}

export function useTaskInfoSidebarWidthStorage(
  defaultValue: number = 440
): [number, (value: number | ((prev: number) => number)) => void] {
  return useDebouncedNumericLocalStorage(STORAGE_KEYS.TASK_INFO_SIDEBAR_WIDTH, defaultValue);
}

export function useNotificationsSidebarWidthStorage(
  defaultValue: number = 380
): [number, (value: number | ((prev: number) => number)) => void] {
  return useDebouncedNumericLocalStorage(STORAGE_KEYS.NOTIFICATIONS_SIDEBAR_WIDTH, defaultValue);
}

/**
 * Ширина колонки «Участники» на доске (свимлейны). По умолчанию — DEVELOPER_COLUMN_WIDTH.
 * Сохраняется в localStorage, можно менять ресайзом.
 */
export function useParticipantsColumnWidthStorage(
  defaultValue: number
): [number, (value: number | ((prev: number) => number)) => void] {
  return useDebouncedNumericLocalStorage(STORAGE_KEYS.PARTICIPANTS_COLUMN_WIDTH, defaultValue);
}

export function useOccupancyTaskColumnWidthStorage(
  defaultValue: number = 280
): [number, (value: number | ((prev: number) => number)) => void] {
  return useDebouncedNumericLocalStorage(STORAGE_KEYS.OCCUPANCY_TASK_COLUMN_WIDTH, defaultValue);
}
