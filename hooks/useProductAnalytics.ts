'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { ANALYTICS_EVENT, shouldSkipAnalyticsPath } from '@/lib/analytics/analyticsEventNames';
import { isClientSettingsStorageKey } from '@/lib/analytics/clientSettingsAllowlist';
import { syncClientSettingsAnalytics } from '@/lib/analytics/clientSettingsPayload';
import { ingestAnalyticsEvents } from '@/lib/api/analytics';

const CLIENT_SETTINGS_INITIAL_DELAY_MS = 1000;
const CLIENT_SETTINGS_DEBOUNCE_MS = 15_000;

function collectPageViewSearch(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.search;
}

function flushClientSettings(): void {
  void syncClientSettingsAnalytics(ingestAnalyticsEvents);
}

function isRelevantSettingsStorageKey(key: string | undefined): boolean {
  return !key || isClientSettingsStorageKey(key);
}

function subscribeClientSettingsAnalytics(): () => void {
  const initialTimer = window.setTimeout(flushClientSettings, CLIENT_SETTINGS_INITIAL_DELAY_MS);
  let debounceTimer: number | undefined;

  const scheduleSync = () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(flushClientSettings, CLIENT_SETTINGS_DEBOUNCE_MS);
  };

  const onCustomStorage = (event: Event) => {
    const key = (event as CustomEvent<{ key?: string }>).detail?.key;
    if (!isRelevantSettingsStorageKey(key)) {
      return;
    }
    scheduleSync();
  };

  const onStorage = (event: StorageEvent) => {
    if (!isRelevantSettingsStorageKey(event.key ?? undefined)) {
      return;
    }
    scheduleSync();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState !== 'hidden') {
      return;
    }
    window.clearTimeout(debounceTimer);
    flushClientSettings();
  };

  window.addEventListener('localStorageChange', onCustomStorage);
  window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', onVisibilityChange);
  return () => {
    window.clearTimeout(initialTimer);
    window.clearTimeout(debounceTimer);
    window.removeEventListener('localStorageChange', onCustomStorage);
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}

/**
 * Снимок localStorage-настроек (первый заход + смена хеша) и просмотры маршрутов.
 * Клики: {@link ingestAnalyticsEvents} с eventName `ui_click`.
 */
export function useProductAnalytics(): void {
  const pathname = usePathname();
  const lastPagePathRef = useRef<string | null>(null);

  useEffect(() => {
    if (shouldSkipAnalyticsPath(pathname) || lastPagePathRef.current === pathname) {
      return;
    }
    lastPagePathRef.current = pathname;
    void ingestAnalyticsEvents([
      {
        eventName: ANALYTICS_EVENT.pageView,
        payload: { path: pathname, search: collectPageViewSearch(), v: 1 },
      },
    ]);
  }, [pathname]);

  useEffect(() => {
    if (shouldSkipAnalyticsPath(pathname)) {
      return;
    }
    return subscribeClientSettingsAnalytics();
  }, [pathname]);
}
