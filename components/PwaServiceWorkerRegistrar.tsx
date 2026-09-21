'use client';

import { useEffect } from 'react';

async function unregisterAllServiceWorkers(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

function registerProductionServiceWorker(): void {
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error: unknown) => {
    console.error('[pwa] service worker registration failed', error);
  });
}

/**
 * В production регистрирует SW. В dev снимает регистрацию, чтобы кэш не ломал HMR.
 */
export function PwaServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }
    if (process.env.NODE_ENV !== 'production') {
      unregisterAllServiceWorkers().catch((error: unknown) => {
        console.error('[pwa] service worker unregister failed', error);
      });
      return;
    }
    registerProductionServiceWorker();
  }, []);

  return null;
}
