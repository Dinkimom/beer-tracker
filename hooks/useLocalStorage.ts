import { resolveFeatureColumnWidthDefault } from './localStorage/featureColumnWidthDefault';
import { STORAGE_KEYS } from './localStorage/storageKeys';
import { getFromStorage } from './localStorage/storagePrimitives';
import { useDebouncedNumericLocalStorage } from './localStorage/useDebouncedNumericLocalStorage';
import { useLocalStorage as useLocalStorageBase } from './localStorage/useLocalStorageBase';

export { useLocalStorageBase as useLocalStorage };

export * from './localStorage/hooksSwimlaneAndKanban';
export * from './localStorage/taskCardSlotLayout';
export * from './localStorage/hooksSelectionThemeAndSync';
export * from './localStorage/hooksSidebarAndDevelopers';

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
 * Ширина колонки исполнителей на свимлейне. По умолчанию — DEVELOPER_COLUMN_WIDTH.
 * Сохраняется отдельно от колонки фич.
 */
export function useParticipantsColumnWidthStorage(
  defaultValue: number
): [number, (value: number | ((prev: number) => number)) => void] {
  return useDebouncedNumericLocalStorage(STORAGE_KEYS.PARTICIPANTS_COLUMN_WIDTH, defaultValue);
}

/** Ширина сайдбара истории версий квартального плана. */
export function useQuarterHistorySidebarWidthStorage(
  defaultValue: number
): [number, (value: number | ((prev: number) => number)) => void] {
  return useDebouncedNumericLocalStorage(STORAGE_KEYS.QUARTER_HISTORY_SIDEBAR_WIDTH, defaultValue);
}

/** Ширина колонки направлений и эпиков на квартальном плане. */
export function useQuarterLeftColumnWidthStorage(
  defaultValue: number
): [number, (value: number | ((prev: number) => number)) => void] {
  return useDebouncedNumericLocalStorage(STORAGE_KEYS.QUARTER_LEFT_COLUMN_WIDTH, defaultValue);
}

/** Слой «Заметки» квартального плана: показывать листы заметок на доске. */
export function useQuarterNotesVisibleStorage(): [boolean, (value: boolean | ((prev: boolean) => boolean)) => void] {
  return useLocalStorageBase<boolean>(STORAGE_KEYS.QUARTER_NOTES_VISIBLE, true);
}

/** Детализация квартального плана: роадмэп, план или по дням (QZ1); значение разбирает `parseQuarterDetailLevel`. */
export function useQuarterDetailLevelStorage(): [string, (value: string | ((prev: string) => string)) => void] {
  return useLocalStorageBase<string>(STORAGE_KEYS.QUARTER_DETAIL_LEVEL, 'plan');
}

/** Слой «Готовые эпики» квартального плана выключен: готовые строки скрыты (QB7). */
export function useQuarterHideDoneStorage(): [boolean, (value: boolean | ((prev: boolean) => boolean)) => void] {
  return useLocalStorageBase<boolean>(STORAGE_KEYS.QUARTER_HIDE_DONE, false);
}

/**
 * Ширина колонки фич. Если ключа ещё нет, стартует с текущей ширины колонки исполнителей.
 */
export function useFeatureColumnWidthStorage(
  defaultValue: number
): [number, (value: number | ((prev: number) => number)) => void] {
  const storedFeatureWidth = readStoredColumnWidth(STORAGE_KEYS.FEATURE_COLUMN_WIDTH);
  const storedAssigneeWidth = getFromStorage(STORAGE_KEYS.PARTICIPANTS_COLUMN_WIDTH, defaultValue);
  return useDebouncedNumericLocalStorage(
    STORAGE_KEYS.FEATURE_COLUMN_WIDTH,
    resolveFeatureColumnWidthDefault(storedFeatureWidth, storedAssigneeWidth)
  );
}

function readStoredColumnWidth(key: string): number | null {
  const value = getFromStorage<unknown>(key, null);
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
