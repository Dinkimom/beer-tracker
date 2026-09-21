import { useCallback, useEffect, useState } from 'react';

import { AppLanguage, DEFAULT_LANGUAGE, isAppLanguage } from '@/lib/i18n/model';
import { PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY } from '@/lib/tenantHttpConstants';
import {
  migrateTrackerTokenInLocalStorage,
  readTrackerTokenPayload,
  writeTrackerTokenPayload,
} from '@/lib/trackerTokenStorage';

import { readSelectedId, writeSelectedId } from './selectedIdStorage';
import { STORAGE_KEYS } from './storageKeys';
import { useLocalStorage as useLocalStorageBase } from './useLocalStorageBase';

type SelectedIdSetterArg<T extends number | null> = T | ((prev: T) => T) | null;

function useSelectedIdStorage(key: string): [
  number | null,
  (id: SelectedIdSetterArg<number | null>) => void,
] {
  const [id, setIdState] = useState<number | null>(() => readSelectedId(key));

  useEffect(() => {
    writeSelectedId(key, id);
  }, [key, id]);

  const setId = useCallback((next: SelectedIdSetterArg<number | null>) => {
    setIdState((prev) => (typeof next === 'function' ? next(prev) : next));
  }, []);

  return [id, setId];
}

/**
 * Выбранный спринт: sessionStorage (изоляции вкладок) + seed в localStorage для новых вкладок.
 * Не подписан на `storage` — иначе две вкладки с разными URL гоняют router.replace.
 */
export function useSelectedSprintStorage(): [
  number | null,
  (sprintId: SelectedIdSetterArg<number | null>) => void,
] {
  return useSelectedIdStorage(STORAGE_KEYS.SELECTED_SPRINT);
}

/**
 * Выбранная доска: тот же per-tab контракт, что и {@link useSelectedSprintStorage}.
 */
export function useSelectedBoardStorage(): [
  number | null,
  (boardId: SelectedIdSetterArg<number | null>) => void,
] {
  return useSelectedIdStorage(STORAGE_KEYS.SELECTED_BOARD);
}

export function useThemeStorage(): [
  'dark' | 'light',
  (theme: 'dark' | 'light' | ((prev: 'dark' | 'light') => 'dark' | 'light')) => void
] {
  return useLocalStorageBase<'dark' | 'light'>(STORAGE_KEYS.THEME, 'light');
}

export function useAppLanguageStorage(): [
  AppLanguage,
  (
    language:
      | AppLanguage
      | ((prev: AppLanguage) => AppLanguage)
  ) => void
] {
  const [storedLanguage, setStoredLanguage] = useLocalStorageBase<string>(
    STORAGE_KEYS.LANGUAGE,
    DEFAULT_LANGUAGE
  );

  const language = isAppLanguage(storedLanguage) ? storedLanguage : DEFAULT_LANGUAGE;

  useEffect(() => {
    if (!isAppLanguage(storedLanguage)) {
      setStoredLanguage(DEFAULT_LANGUAGE);
    }
  }, [storedLanguage, setStoredLanguage]);

  const setLanguage = useCallback(
    (nextValue: AppLanguage | ((prev: AppLanguage) => AppLanguage)) => {
      setStoredLanguage((prev) => {
        const safePrev = isAppLanguage(prev) ? prev : DEFAULT_LANGUAGE;
        const candidate =
          typeof nextValue === 'function'
            ? nextValue(safePrev)
            : nextValue;
        return isAppLanguage(candidate) ? candidate : DEFAULT_LANGUAGE;
      });
    },
    [setStoredLanguage]
  );

  return [language, setLanguage];
}

export function useChristmasThemeStorage(): [
  boolean,
  (enabled: boolean | ((prev: boolean) => boolean)) => void
] {
  return useLocalStorageBase<boolean>(STORAGE_KEYS.CHRISTMAS_THEME, true);
}

export function useShowHolidaysStorage(): [
  boolean,
  (value: boolean | ((prev: boolean) => boolean)) => void
] {
  return useLocalStorageBase<boolean>(STORAGE_KEYS.SHOW_HOLIDAYS, true);
}

/**
 * Глобальная настройка синхронизации оценок с трекером.
 * Если выключено — UI может продолжать работать, но без отправки оценок в трекер.
 */
export function useDataSyncEstimatesStorage(): [
  boolean,
  (value: boolean | ((prev: boolean) => boolean)) => void
] {
  return useLocalStorageBase<boolean>(STORAGE_KEYS.DATA_SYNC_ESTIMATES, true);
}

/**
 * Глобальная настройка синхронизации исполнителей с трекером.
 * Если выключено — изменения исполнителей не должны отправляться в трекер.
 */
export function useDataSyncAssigneesStorage(): [
  boolean,
  (value: boolean | ((prev: boolean) => boolean)) => void
] {
  return useLocalStorageBase<boolean>(STORAGE_KEYS.DATA_SYNC_ASSIGNEES, true);
}

/**
 * OAuth токен трекера в localStorage: объект `{ token, organizationId }` (миграция со строки).
 * Первый элемент — сохранённый токен (для форм); при несовпадении org с активной tenant «эффективный»
 * токен для API см. {@link getEffectiveTrackerTokenForBrowser} / AuthGuard.
 */
export function useTrackerTokenStorage(): [
  string,
  (token: string, organizationId?: string, email?: string) => void,
] {
  const [, setTick] = useState(() => {
    migrateTrackerTokenInLocalStorage();
    return 0;
  });
  const bump = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === STORAGE_KEYS.TRACKER_TOKEN ||
        e.key === PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY
      ) {
        bump();
      }
    };
    const onCustom = (e: Event) => {
      const k = (e as CustomEvent<{ key?: string }>).detail?.key;
      if (k === STORAGE_KEYS.TRACKER_TOKEN || k === PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY) {
        bump();
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('localStorageChange', onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('localStorageChange', onCustom as EventListener);
    };
  }, [bump]);

  const setToken = useCallback(
    (token: string, organizationId?: string, email?: string) => {
      const trimmed = token.trim();
      if (!trimmed) {
        writeTrackerTokenPayload({ organizationId: '', token: '' });
        window.dispatchEvent(
          new CustomEvent('localStorageChange', { detail: { key: STORAGE_KEYS.TRACKER_TOKEN } })
        );
        bump();
        return;
      }
      let org = organizationId?.trim() ?? '';
      if (!org) {
        try {
          org = localStorage.getItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY)?.trim() ?? '';
        } catch {
          org = '';
        }
      }
      const existing = readTrackerTokenPayload();
      const nextEmail =
        email?.trim() || (org === existing.organizationId ? existing.email?.trim() ?? '' : '');
      writeTrackerTokenPayload({
        email: nextEmail || undefined,
        organizationId: org,
        token: trimmed,
      });
      window.dispatchEvent(
        new CustomEvent('localStorageChange', { detail: { key: STORAGE_KEYS.TRACKER_TOKEN } })
      );
      bump();
    },
    [bump]
  );

  const payload = readTrackerTokenPayload();
  return [payload.token, setToken];
}

/** Схема цвета фаз плана и карточек задач (свимлейн, занятость, канбан) */
export type PlanningPhaseCardColorScheme = 'monochrome' | 'status';

export function usePlanningPhaseCardColorSchemeStorage(): [
  PlanningPhaseCardColorScheme,
  (
    value:
      | PlanningPhaseCardColorScheme
      | ((prev: PlanningPhaseCardColorScheme) => PlanningPhaseCardColorScheme)
  ) => void,
] {
  return useLocalStorageBase<PlanningPhaseCardColorScheme>(
    STORAGE_KEYS.PLANNING_PHASE_CARD_COLOR_SCHEME,
    'status'
  );
}
