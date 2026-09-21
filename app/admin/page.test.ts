import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCachedAdminOrganizationContextMock,
  getVerifiedProductUserIdFromServerCookiesMock,
  redirectMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  getVerifiedProductUserIdFromServerCookiesMock: vi.fn(),
  getCachedAdminOrganizationContextMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('@/lib/auth', () => ({
  getVerifiedProductUserIdFromServerCookies: getVerifiedProductUserIdFromServerCookiesMock,
}));

vi.mock('@/lib/access/adminOrganizationContext', () => ({
  getCachedAdminOrganizationContext: getCachedAdminOrganizationContextMock,
}));

import AdminPage from './page';

describe('app/admin/page', () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getVerifiedProductUserIdFromServerCookiesMock.mockReset();
    getCachedAdminOrganizationContextMock.mockReset();
  });

  it('redirects to organization setup when user has no organizations', async () => {
    getVerifiedProductUserIdFromServerCookiesMock.mockResolvedValue('user-1');
    getCachedAdminOrganizationContextMock.mockResolvedValue({
      activeOrganizationId: '',
      orgs: [],
    });

    await expect(AdminPage()).rejects.toThrow('REDIRECT:/admin/org');
    expect(redirectMock).toHaveBeenCalledWith('/admin/org');
  });

  it('redirects org members without admin to tracker settings', async () => {
    getVerifiedProductUserIdFromServerCookiesMock.mockResolvedValue('user-1');
    getCachedAdminOrganizationContextMock.mockResolvedValue({
      activeOrganizationId: 'org-1',
      orgs: [
        {
          canAccessAdmin: false,
          canUsePlanner: true,
          initial_sync_completed_at: null,
          managedTeamIds: [],
          name: 'Org 1',
          organization_id: 'org-1',
          role: 'member',
          slug: null,
        },
      ],
    });

    await expect(AdminPage()).rejects.toThrow('REDIRECT:/admin/tracker');
    expect(redirectMock).toHaveBeenCalledWith('/admin/tracker');
  });
});
