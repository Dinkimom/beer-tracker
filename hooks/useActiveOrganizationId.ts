import { useSyncExternalStore } from 'react';

import { DEMO_ORG_ID } from '@/lib/demo/demoIds';
import { PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY } from '@/lib/tenantHttpConstants';

function readActiveOrganizationId(): string | null {
  try {
    const value = localStorage.getItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY)?.trim();
    if (!value || value === DEMO_ORG_ID) {
      // Демо-организация фикстуры не должна утекать в боевые `/api/*` (как в `lib/axios.ts`).
      if (value === DEMO_ORG_ID) {
        localStorage.removeItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY);
      }
      return null;
    }
    return value;
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
