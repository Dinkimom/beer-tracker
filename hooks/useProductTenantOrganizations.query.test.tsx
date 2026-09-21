/** @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchProductSession } from '@/lib/api/auth';
import { PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY } from '@/lib/tenantHttpConstants';

import { useProductTenantOrganizations } from './useProductTenantOrganizations';

vi.mock('@/lib/api/auth', () => ({
  fetchProductSession: vi.fn(),
}));

const fetchProductSessionMock = vi.mocked(fetchProductSession);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnMount: false,
        retry: false,
        staleTime: 1000 * 60 * 5,
      },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe('useProductTenantOrganizations query sharing', () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('issues one /auth/session request when several hooks mount together', async () => {
    let resolveFetch: (value: Awaited<ReturnType<typeof fetchProductSession>>) => void = () => {};
    fetchProductSessionMock.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    const wrapper = createWrapper();
    const { result: first } = renderHook(() => useProductTenantOrganizations({ pollIntervalMs: 0 }), {
      wrapper,
    });
    const { result: second } = renderHook(
      () => useProductTenantOrganizations({ pollIntervalMs: 0 }),
      { wrapper }
    );

    expect(fetchProductSessionMock).toHaveBeenCalledTimes(1);

    resolveFetch({
      organizations: [
        {
          canAccessAdmin: true,
          canUsePlanner: true,
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Acme',
          role: 'org_admin',
          slug: 'acme',
        },
      ],
      user: { email: 'n@example.com', emailVerified: true, id: 'user-1' },
    });

    await waitFor(() => {
      expect(first.current.sessionLoading).toBe(false);
      expect(second.current.sessionLoading).toBe(false);
    });
    expect(fetchProductSessionMock).toHaveBeenCalledTimes(1);
    expect(first.current.signedIn).toBe(true);
    expect(second.current.activeOrganizationId).toBe(first.current.activeOrganizationId);
  });

  it('does not clear a stored tenant when /auth/session is still anonymous', async () => {
    const orgId = '11111111-1111-4111-8111-111111111111';
    localStorage.setItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY, orgId);
    fetchProductSessionMock.mockResolvedValue({
      organizations: [],
      user: null,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useProductTenantOrganizations({ pollIntervalMs: 0 }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.sessionLoading).toBe(false);
    });
    expect(result.current.activeOrganizationId).toBe(orgId);
    expect(localStorage.getItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY)).toBe(orgId);
  });
});
