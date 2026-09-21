'use client';

import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
let observer: MutationObserver | null = null;

function subscribe(onStoreChange: () => void) {
  if (typeof document === 'undefined') {
    return () => {};
  }
  listeners.add(onStoreChange);
  if (!observer) {
    observer = new MutationObserver(() => {
      for (const l of listeners) l();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }
  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0 && observer) {
      observer.disconnect();
      observer = null;
    }
  };
}

function getSnapshot(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Есть ли на <html> класс `dark` (как у next-themes / ThemeProvider).
 * Один общий MutationObserver на всех подписчиков — без N observer’ов на каждый виджет.
 */
export function useDocumentDarkClass(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
