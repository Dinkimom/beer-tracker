import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { enrichOrganizationSummariesForUser } from '@/lib/access/orgAccess';
import { getProductUserIdFromRequest } from '@/lib/auth/productSession';
import { findUserById } from '@/lib/auth/userRepository';
import { listUserOrganizations } from '@/lib/organizations/organizationMembersRepository';

import { buildProductSessionResponse } from './sessionRouteHelpers';

vi.mock('@/lib/auth/productSession', () => ({
  getProductUserIdFromRequest: vi.fn(),
}));
vi.mock('@/lib/auth/userRepository', () => ({
  findUserById: vi.fn(),
}));
vi.mock('@/lib/organizations/organizationMembersRepository', () => ({
  listUserOrganizations: vi.fn(),
}));
vi.mock('@/lib/access/orgAccess', () => ({
  enrichOrganizationSummariesForUser: vi.fn(),
}));

const SESSION_USER = '5430155e-d01e-11ea-fa98-fa163e1c52c6';

describe('buildProductSessionResponse', () => {
  const prev = process.env.AUTH_SESSION_SECRET;

  beforeEach(() => {
    process.env.AUTH_SESSION_SECRET = 'test-auth-session-secret-min-32-chars!';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getProductUserIdFromRequest).mockReset();
    vi.mocked(findUserById).mockReset();
    vi.mocked(listUserOrganizations).mockReset();
    vi.mocked(enrichOrganizationSummariesForUser).mockReset();
  });

  afterEach(() => {
    process.env.AUTH_SESSION_SECRET = prev;
    vi.mocked(console.error).mockRestore();
  });

  it('returns empty session without cookie', async () => {
    vi.mocked(getProductUserIdFromRequest).mockReturnValue(null);
    const res = await buildProductSessionResponse(new Request('http://localhost/api/auth/session'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: null, organizations: [] });
    expect(findUserById).not.toHaveBeenCalled();
  });

  it('clears cookie when identity is gone', async () => {
    vi.mocked(getProductUserIdFromRequest).mockReturnValue(SESSION_USER);
    vi.mocked(findUserById).mockResolvedValue(null);
    const res = await buildProductSessionResponse(new Request('http://localhost/api/auth/session'));
    expect(await res.json()).toEqual({ user: null, organizations: [] });
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie.toLowerCase()).toContain('max-age=0');
  });

  it('returns session for staff identity', async () => {
    vi.mocked(getProductUserIdFromRequest).mockReturnValue(SESSION_USER);
    vi.mocked(findUserById).mockResolvedValue({
      created_at: new Date(),
      email: 'a@example.com',
      id: SESSION_USER,
    });
    vi.mocked(listUserOrganizations).mockResolvedValue([]);
    vi.mocked(enrichOrganizationSummariesForUser).mockResolvedValue([]);

    const res = await buildProductSessionResponse(new Request('http://localhost/api/auth/session'));
    const body = await res.json();
    expect(body.user).toEqual({
      email: 'a@example.com',
      emailVerified: true,
      id: SESSION_USER,
    });
    expect(listUserOrganizations).toHaveBeenCalledWith(SESSION_USER);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('returns empty session instead of 500 when lookup throws', async () => {
    vi.mocked(getProductUserIdFromRequest).mockReturnValue(SESSION_USER);
    vi.mocked(findUserById).mockRejectedValue(new Error('db down'));
    const res = await buildProductSessionResponse(new Request('http://localhost/api/auth/session'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: null, organizations: [] });
  });
});
