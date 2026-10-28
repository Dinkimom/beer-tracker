import { useSyncExternalStore } from 'react';

import { PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY } from '@/lib/tenantHttpConstants';

function readActiveOrganizationId(): string | null {
  try {
    const value = localStorage.getItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY)?.trim();
    return value || null;
  } catch {
    return null;
  }
}

function subscribeActiveOrganizationId(onChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  window.addEventListener('storage', onChange);
  window.addEventListener('localStorageChange', onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener('localStorageChange', onChange);
  };
}

/** Активная организация продукта из localStorage (реактивно к смене вкладкой/другим окном). */
export function useActiveOrganizationId(): string | null {
  return useSyncExternalStore(subscribeActiveOrganizationId, readActiveOrganizationId, () => null);
}
