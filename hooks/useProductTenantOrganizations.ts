import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { fetchProductSession } from '@/lib/api/auth';
import { parseRegistryUuidString } from '@/lib/registryUuidString';
import { PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY } from '@/lib/tenantHttpConstants';

const productSessionQueryKey = ['product-session'] as const;

export { productSessionQueryKey };

type ProductSessionOrgRole = 'member' | 'org_admin' | 'team_lead';

interface ProductSessionOrganization {
  canAccessAdmin: boolean;
  canUsePlanner: boolean;
  id: string;
  /** `null` — org_admin (все команды); иначе пустой список. */
  managedTeamIds: string[] | null;
  name: string;
  role: ProductSessionOrgRole;
  slug: string | null;
}

interface SessionResponse {
  organizations?: Array<{
    canAccessAdmin?: boolean;
    canUsePlanner?: boolean;
    id: string;
    managedTeamIds?: string[] | null;
    name: string;
    role: ProductSessionOrgRole;
    slug: string | null;
  }>;
  user: { email: string; emailVerified: boolean; id: string } | null;
}

function readStoredOrganizationId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const v = localStorage.getItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY);
    return parseRegistryUuidString(v);
  } catch {
    return null;
  }
}

function writeStoredOrganizationId(id: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (!id) {
      localStorage.removeItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY);
    } else {
      localStorage.setItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY, id);
    }
    window.dispatchEvent(
      new CustomEvent('localStorageChange', {
        detail: { key: PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY },
      })
    );
  } catch {
    /* ignore */
  }
}

function getServerStoredOrganizationId(): null {
  return null;
}

function subscribeStoredOrganizationId(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const onCustom = (event: Event) => {
    const key = (event as CustomEvent<{ key?: string }>).detail?.key;
    if (key === PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY) {
      onStoreChange();
    }
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY) {
      onStoreChange();
    }
  };
  window.addEventListener('localStorageChange', onCustom as EventListener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('localStorageChange', onCustom as EventListener);
    window.removeEventListener('storage', onStorage);
  };
}

function managedTeamIdsFromSessionOrg(
  o: NonNullable<SessionResponse['organizations']>[number]
): string[] | null {
  if (o.managedTeamIds !== undefined) {
    return o.managedTeamIds;
  }
  return o.role === 'org_admin' ? null : [];
}

export function normalizeProductSessionOrganizations(
  raw: SessionResponse['organizations']
): ProductSessionOrganization[] {
  if (!raw?.length) {
    return [];
  }
  return raw.map((o) => ({
    canAccessAdmin: o.canAccessAdmin ?? o.role === 'org_admin',
    canUsePlanner: o.canUsePlanner ?? true,
    id: o.id,
    managedTeamIds: managedTeamIdsFromSessionOrg(o),
    name: o.name,
    role: o.role,
    slug: o.slug,
  }));
}

/** Сохранённый tenant, если он ещё в сессии; иначе первая организация. */
export function resolveActiveOrganizationId(
  storedId: string | null,
  list: ProductSessionOrganization[]
): string | null {
  if (list.length === 0) {
    return null;
  }
  if (storedId && list.some((o) => o.id === storedId)) {
    return storedId;
  }
  return list[0]!.id;
}

/**
 * Анонимный ответ `/auth/session` (ещё нет cookie) не должен затирать tenant,
 * к которому только что привязали токен трекера — иначе AuthGuard снова шлёт на /auth-setup.
 */
export function shouldSyncStoredOrganizationFromSession(args: {
  organizationCount: number;
  signedIn: boolean;
}): boolean {
  return args.signedIn || args.organizationCount > 0;
}

export function resolveDisplayedActiveOrganizationId(args: {
  organizations: ProductSessionOrganization[];
  signedIn: boolean;
  storedId: string | null;
}): string | null {
  if (
    !shouldSyncStoredOrganizationFromSession({
      organizationCount: args.organizations.length,
      signedIn: args.signedIn,
    })
  ) {
    return args.storedId;
  }
  return resolveActiveOrganizationId(args.storedId, args.organizations);
}

interface UseProductTenantOrganizationsResult {
  activeOrganization: ProductSessionOrganization | null;
  activeOrganizationId: string | null;
  organizations: ProductSessionOrganization[];
  /** Загрузка первого ответа сессии. */
  sessionLoading: boolean;
  signedIn: boolean;
  setActiveOrganizationId: (organizationId: string) => void;
}

const DEFAULT_POLL_MS = 30_000;

/**
 * Сессия продукта: список организаций, активный tenant в localStorage + заголовок {@link TENANT_ORG_HEADER}.
 * Один React Query на все mount'ы (планер больше не бьёт `/api/auth/session` четырежды).
 */
export function useProductTenantOrganizations(options?: {
  pollIntervalMs?: number;
}): UseProductTenantOrganizationsResult {
  const queryClient = useQueryClient();
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_MS;

  const { data, isPending } = useQuery({
    queryFn: fetchProductSession,
    queryKey: productSessionQueryKey,
    refetchInterval: pollIntervalMs > 0 ? pollIntervalMs : false,
    refetchOnMount: false,
    retry: false,
  });

  const organizations = useMemo(
    () => normalizeProductSessionOrganizations(data?.organizations),
    [data]
  );
  const signedIn = data?.user != null;
  const storedOrganizationId = useSyncExternalStore(
    subscribeStoredOrganizationId,
    readStoredOrganizationId,
    getServerStoredOrganizationId
  );
  const activeOrganizationId = data
    ? resolveDisplayedActiveOrganizationId({
        organizations,
        signedIn,
        storedId: storedOrganizationId,
      })
    : storedOrganizationId;

  useEffect(() => {
    if (!data) {
      return;
    }
    if (
      !shouldSyncStoredOrganizationFromSession({
        organizationCount: organizations.length,
        signedIn,
      })
    ) {
      return;
    }
    const next = resolveActiveOrganizationId(storedOrganizationId, organizations);
    if (next !== storedOrganizationId) {
      writeStoredOrganizationId(next);
    }
  }, [data, organizations, signedIn, storedOrganizationId]);

  const setActiveOrganizationId = useCallback(
    (organizationId: string) => {
      if (!organizations.some((o) => o.id === organizationId)) {
        return;
      }
      writeStoredOrganizationId(organizationId);
      queryClient.invalidateQueries().catch(() => {
        /* ignore */
      });
    },
    [organizations, queryClient]
  );

  const activeOrganization =
    activeOrganizationId != null
      ? organizations.find((o) => o.id === activeOrganizationId) ?? null
      : null;

  return {
    activeOrganization,
    activeOrganizationId,
    organizations,
    sessionLoading: isPending,
    setActiveOrganizationId,
    signedIn,
  };
}
