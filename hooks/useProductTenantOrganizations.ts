import type { OrganizationIssueTrackerPublicDto } from '@/lib/issueTrackerProvider/settings';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { useDemoPlannerShell } from '@/contexts/DemoPlannerShellContext';
import { fetchDemoProductSession, fetchProductSession } from '@/lib/api/auth';
import { DEMO_ORG_ID } from '@/lib/demo/demoIds';
import { parseRegistryUuidString } from '@/lib/registryUuidString';
import { PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY } from '@/lib/tenantHttpConstants';

const productSessionQueryKey = ['product-session'] as const;
/** Отдельный кэш сессии для `/demo/planner`, чтобы фикстуры не затирали реальный tenant. */
const demoProductSessionQueryKey = [...productSessionQueryKey, 'demo'] as const;

export { productSessionQueryKey };

type ProductSessionOrgRole = 'member' | 'org_admin' | 'team_lead';

interface ProductSessionOrganization {
  canAccessAdmin: boolean;
  canUsePlanner: boolean;
  id: string;
  /** `null` — трекер ещё не подключён. */
  issueTracker: OrganizationIssueTrackerPublicDto | null;
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
    issueTracker?: OrganizationIssueTrackerPublicDto | null;
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
    const parsed = parseRegistryUuidString(v);
    // Fixture org from `/demo/planner` must never stick as the real tenant header.
    if (parsed === DEMO_ORG_ID) {
      localStorage.removeItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredOrganizationId(id: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const previous = parseRegistryUuidString(
      localStorage.getItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY)
    );
    const next = id === DEMO_ORG_ID ? null : id;
    if (previous === next) {
      return;
    }
    if (!next) {
      localStorage.removeItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY);
    } else {
      localStorage.setItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY, next);
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
    issueTracker: o.issueTracker ?? null,
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
 * Анонимный или «пустой» ответ `/auth/session` не должен затирать tenant в localStorage.
 * Иначе: (1) гонка до cookie после OAuth → AuthGuard на /auth-setup;
 * (2) отравленный кэш demo-сессии (signedIn + только DEMO_ORG, после фильтра orgs=[]) →
 * writeStoredOrganizationId(null) → токен без active org → снова /auth-setup.
 */
export function shouldSyncStoredOrganizationFromSession(args: {
  organizationCount: number;
  /** Kept for call-site compatibility; sync keys off org list only. */
  signedIn: boolean;
}): boolean {
  return args.organizationCount > 0;
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
  const { isDemoPlanner } = useDemoPlannerShell();
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_MS;
  const sessionQueryKey = isDemoPlanner ? demoProductSessionQueryKey : productSessionQueryKey;

  const { data, isPending } = useQuery({
    queryFn: isDemoPlanner ? fetchDemoProductSession : fetchProductSession,
    queryKey: sessionQueryKey,
    refetchInterval: pollIntervalMs > 0 ? pollIntervalMs : false,
    refetchOnMount: false,
    retry: false,
  });

  const organizations = useMemo(() => {
    const normalized = normalizeProductSessionOrganizations(data?.organizations);
    // Fixture session must never drive the real tenant (SSE / X-Organization-Id / auth-setup).
    if (isDemoPlanner) {
      return normalized;
    }
    return normalized.filter((org) => org.id !== DEMO_ORG_ID);
  }, [data, isDemoPlanner]);
  const signedIn = data?.user != null;

  useEffect(() => {
    if (isDemoPlanner || !data) {
      return;
    }
    const raw = normalizeProductSessionOrganizations(data.organizations);
    if (raw.some((org) => org.id === DEMO_ORG_ID)) {
      // Drop poisoned cache from an older demo visit that shared product-session key.
      queryClient.removeQueries({ queryKey: productSessionQueryKey });
    }
  }, [data, isDemoPlanner, queryClient]);
  const storedOrganizationId = useSyncExternalStore(
    subscribeStoredOrganizationId,
    readStoredOrganizationId,
    getServerStoredOrganizationId
  );
  let activeOrganizationId: string | null = storedOrganizationId;
  if (isDemoPlanner) {
    activeOrganizationId = resolveActiveOrganizationId(null, organizations);
  } else if (data) {
    activeOrganizationId = resolveDisplayedActiveOrganizationId({
      organizations,
      signedIn,
      storedId: storedOrganizationId,
    });
  }

  useEffect(() => {
    if (isDemoPlanner || !data) {
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
  }, [data, isDemoPlanner, organizations, signedIn, storedOrganizationId]);

  const setActiveOrganizationId = useCallback(
    (organizationId: string) => {
      if (isDemoPlanner) {
        return;
      }
      if (!organizations.some((o) => o.id === organizationId)) {
        return;
      }
      writeStoredOrganizationId(organizationId);
      queryClient.invalidateQueries().catch(() => {
        /* ignore */
      });
    },
    [isDemoPlanner, organizations, queryClient]
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
