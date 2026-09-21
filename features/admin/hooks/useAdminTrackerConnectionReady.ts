import { useEffect, useState } from 'react';

import { fetchAdminTrackerConnectionState } from '@/lib/api/auth';
import { isOrganizationTrackerConnectionReady } from '@/lib/organizations/organizationTrackerAdminFormState';

/** Событие после успешного сохранения настроек трекера — снимает блокировки в `AdminShell` без смены `org` в URL. */
const ADMIN_TRACKER_CONNECTION_CHANGED_EVENT = 'beer-tracker:admin-tracker-connection-changed';

export function notifyAdminTrackerConnectionChanged(organizationId: string) {
  if (typeof window === 'undefined' || !organizationId) return;
  window.dispatchEvent(
    new CustomEvent(ADMIN_TRACKER_CONNECTION_CHANGED_EVENT, { detail: { organizationId } })
  );
}

/**
 * Клиентская проверка: для организации сохранены OAuth-токен и Cloud Organization ID.
 * Совпадает с условием редиректа на страницах «Команды» / «Синхронизация».
 */
export function useAdminTrackerConnectionReady(organizationId: string) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(() => Boolean(organizationId));
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const onChanged = (e: Event) => {
      const id = (e as CustomEvent<{ organizationId?: string }>).detail?.organizationId;
      if (id !== organizationId) return;
      setRefreshToken((n) => n + 1);
    };
    window.addEventListener(ADMIN_TRACKER_CONNECTION_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(ADMIN_TRACKER_CONNECTION_CHANGED_EVENT, onChanged);
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) {
      setReady(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);

    async function loadTrackerConnectionReady() {
      try {
        const data = await fetchAdminTrackerConnectionState(organizationId, {
          signal: controller.signal,
        });
        const nextReady = isOrganizationTrackerConnectionReady({
          hasStoredToken: data.hasStoredToken === true,
          organizationId: data.organizationId ?? organizationId,
          trackerOrgId: data.trackerOrgId ?? '',
        });
        if (!cancelled) {
          setReady(nextReady);
        }
      } catch {
        if (!cancelled) setReady(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadTrackerConnectionReady();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [organizationId, refreshToken]);

  return { loading, ready };
}
