import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findUserByIdMock,
  getCachedAdminOrganizationContextMock,
  getVerifiedProductUserIdFromServerCookiesMock,
  redirectMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  getVerifiedProductUserIdFromServerCookiesMock: vi.fn(),
  findUserByIdMock: vi.fn(),
  getCachedAdminOrganizationContextMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('@/lib/auth', () => ({
  findUserById: findUserByIdMock,
  getVerifiedProductUserIdFromServerCookies: getVerifiedProductUserIdFromServerCookiesMock,
}));

vi.mock('@/lib/access/adminOrganizationContext', () => ({
  getCachedAdminOrganizationContext: getCachedAdminOrganizationContextMock,
}));

import AdminLayout from './layout';

describe('app/admin/layout', () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getVerifiedProductUserIdFromServerCookiesMock.mockReset();
    findUserByIdMock.mockReset();
    getCachedAdminOrganizationContextMock.mockReset();
  });

  it('does not redirect to admin-forbidden when organizations list is empty', async () => {
    getVerifiedProductUserIdFromServerCookiesMock.mockResolvedValue('user-1');
    findUserByIdMock.mockResolvedValue({ email: 'new-user@example.com' });
    getCachedAdminOrganizationContextMock.mockResolvedValue({
      activeOrganizationId: '',
      isSuperAdmin: false,
      orgs: [],
    });

    await expect(AdminLayout({ children: 'content' })).resolves.toBeDefined();
    expect(redirectMock).not.toHaveBeenCalledWith('/?notice=admin-forbidden');
  });

  it('allows org members without admin role (tracker settings)', async () => {
    getVerifiedProductUserIdFromServerCookiesMock.mockResolvedValue('user-1');
    findUserByIdMock.mockResolvedValue({ email: 'member@example.com' });
    getCachedAdminOrganizationContextMock.mockResolvedValue({
      activeOrganizationId: 'org-1',
      isSuperAdmin: false,
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

    await expect(AdminLayout({ children: 'content' })).resolves.toBeDefined();
    expect(redirectMock).not.toHaveBeenCalledWith('/?notice=admin-forbidden');
  });
});
