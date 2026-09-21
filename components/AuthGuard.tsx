'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';

import { LoadingOverlayView } from '@/components/LoadingOverlayView';
import { useI18n } from '@/contexts/LanguageContext';
import {
  getTrackerTokenGateSnapshot,
  subscribeTrackerTokenGate,
} from '@/lib/trackerTokenStorage';

import { resolveMissingTrackerTokenRedirect } from './authGuardResolveMissingToken';

function subscribeClient() {
  return () => {};
}
function getClientSnapshot() {
  return true;
}
function getServerSnapshot() {
  return false;
}

interface AuthGuardProps {
  children: React.ReactNode;
}

/** Маршруты без OAuth-токена трекера в localStorage (онбординг продукта, админка SaaS). */
function bypassTrackerToken(pathname: string): boolean {
  if (
    pathname === '/auth-setup' ||
    pathname === '/login' ||
    pathname === '/register'
  ) {
    return true;
  }
  if (pathname.startsWith('/admin')) {
    return true;
  }
  if (pathname.startsWith('/demo')) {
    return true;
  }
  return false;
}

/**
 * Компонент для защиты маршрутов, требующих OAuth-токен трекера в браузере.
 * On-prem до инициализации БД — сразу на первичную регистрацию (`/register?next=/admin`),
 * иначе при отсутствии токена — на `/auth-setup`.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const usableTrackerToken = useSyncExternalStore(
    subscribeTrackerTokenGate,
    getTrackerTokenGateSnapshot,
    () => ''
  );
  const isMounted = useSyncExternalStore(subscribeClient, getClientSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!isMounted || bypassTrackerToken(pathname)) {
      return;
    }

    if (usableTrackerToken && usableTrackerToken.trim() !== '') {
      return;
    }

    let cancelled = false;
    async function resolveMissingTrackerToken() {
      const destination = await resolveMissingTrackerTokenRedirect();
      if (cancelled) {
        return;
      }
      if (destination === 'register') {
        router.replace('/register?next=/admin');
        return;
      }
      router.push('/auth-setup');
    }
    void resolveMissingTrackerToken();
    return () => {
      cancelled = true;
    };
  }, [isMounted, pathname, router, usableTrackerToken]);

  const hasUsableTrackerToken = Boolean(usableTrackerToken && usableTrackerToken.trim() !== '');
  const loadingMessage = t('common.loading');

  // До монтирования рендерим тот же UI, что и на сервере (избегаем hydration mismatch)
  if (!isMounted || !(bypassTrackerToken(pathname) || hasUsableTrackerToken)) {
    return <LoadingOverlayView message={loadingMessage} />;
  }

  return children;
}
