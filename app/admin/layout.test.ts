import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findUserByIdMock,
  getCachedAdminOrganizationContextMock,
  getVerifiedProductUserIdFromServerCookiesMock,
  redirectMock,
  forbiddenMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  forbiddenMock: vi.fn(() => {
    throw new Error('FORBIDDEN');
  }),
  getVerifiedProductUserIdFromServerCookiesMock: vi.fn(),
  findUserByIdMock: vi.fn(),
  getCachedAdminOrganizationContextMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  forbidden: forbiddenMock,
}));

vi.mock('@/lib/auth', () => ({
  findUserById: findUserByIdMock,
  getVerifiedProductUserIdFromServerCookies: getVerifiedProductUserIdFromServerCookiesMock,
}));

vi.mock('@/lib/access/adminOrganizationContext', () => ({
  getCachedAdminOrganizationContext: getCachedAdminOrganizationContextMock,
}));

vi.mock('@/lib/env', () => ({
  isExporterEnabled: () => false,
}));

vi.mock('@/features/admin/AdminOrganizationIdContext', () => ({
  AdminOrganizationIdProvider: ({ children }: { children: unknown }) => children,
}));

vi.mock('@/features/admin/AdminShell', () => ({
  AdminShell: ({ children }: { children: unknown }) => children,
}));

import AdminLayout from './layout';

describe('app/admin/layout', () => {
  beforeEach(() => {
    redirectMock.mockClear();
    forbiddenMock.mockClear();
    getVerifiedProductUserIdFromServerCookiesMock.mockReset();
    findUserByIdMock.mockReset();
    getCachedAdminOrganizationContextMock.mockReset();
  });

  it('allows empty organizations list for onboarding', async () => {
    getVerifiedProductUserIdFromServerCookiesMock.mockResolvedValue('user-1');
    findUserByIdMock.mockResolvedValue({
      display_name: 'New User',
      email: 'new-user@example.com',
    });
    getCachedAdminOrganizationContextMock.mockResolvedValue({
      activeOrganizationId: '',
      isSuperAdmin: false,
      orgs: [],
    });

    await expect(AdminLayout({ children: 'content' })).resolves.toBeDefined();
    expect(forbiddenMock).not.toHaveBeenCalled();
  });

  it('forbids org members without admin role', async () => {
    getVerifiedProductUserIdFromServerCookiesMock.mockResolvedValue('user-1');
    findUserByIdMock.mockResolvedValue({
      display_name: 'Member',
      email: 'member@example.com',
    });    getCachedAdminOrganizationContextMock.mockResolvedValue({
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

    await expect(AdminLayout({ children: 'content' })).rejects.toThrow('FORBIDDEN');
    expect(forbiddenMock).toHaveBeenCalledOnce();
  });
});
