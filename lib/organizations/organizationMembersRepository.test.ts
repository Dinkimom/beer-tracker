import { beforeEach, describe, expect, it, vi } from 'vitest';

import { countAdmins } from '@/lib/auth/adminsRepository';
import { isProductSuperAdmin } from '@/lib/auth/superAdmin';
import { findUserById } from '@/lib/auth/userRepository';
import { query } from '@/lib/db';
import { findOrganizationById } from '@/lib/organizations/organizationRepository';

import {
  countOrganizationMembersByRole,
  findOrganizationMembership,
  listOrganizationMembers,
  parseMemberDirectoryTeamsJson,
} from './organizationMembersRepository';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

vi.mock('@/lib/auth/userRepository', () => ({
  findUserById: vi.fn(),
}));

vi.mock('@/lib/auth/superAdmin', () => ({
  isProductSuperAdmin: vi.fn(),
}));

vi.mock('@/lib/auth/adminsRepository', () => ({
  countAdmins: vi.fn(),
  deleteAdmin: vi.fn(),
  insertAdmin: vi.fn(),
}));

vi.mock('@/lib/organizations/organizationRepository', () => ({
  findOrganizationById: vi.fn(),
  listAllOrganizationsAdminSummaries: vi.fn(),
}));

describe('organizationMembersRepository', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
    vi.mocked(isProductSuperAdmin).mockReset();
    vi.mocked(isProductSuperAdmin).mockResolvedValue(false);
    vi.mocked(countAdmins).mockReset();
  });

  it('findOrganizationMembership resolves member via staff identity', async () => {
    vi.mocked(findOrganizationById).mockResolvedValue({ id: 'org-a' } as never);
    vi.mocked(findUserById).mockResolvedValue({
      created_at: new Date('2024-01-01T00:00:00.000Z'),
      email: 'member@example.com',
      id: 'user-b',
    } as never);

    const row = await findOrganizationMembership('org-a', 'user-b');
    expect(row?.organization_id).toBe('org-a');
    expect(row?.user_id).toBe('user-b');
    expect(row?.role).toBe('member');
    expect(query).not.toHaveBeenCalled();
  });

  it('findOrganizationMembership uses staff identity id, not cookie sub', async () => {
    vi.mocked(findOrganizationById).mockResolvedValue({ id: 'org-a' } as never);
    vi.mocked(findUserById).mockResolvedValue({
      created_at: new Date('2024-01-01T00:00:00.000Z'),
      email: 'member@example.com',
      id: 'registry-id',
    } as never);

    const row = await findOrganizationMembership('org-a', 'legacy-cookie-id');
    expect(row?.user_id).toBe('registry-id');
  });

  it('listOrganizationMembers joins staff with admins', async () => {
    vi.mocked(findOrganizationById).mockResolvedValue({ id: 'org-x' } as never);
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);
    await listOrganizationMembers('org-x');
    const [sql, params] = vi.mocked(query).mock.calls[0]!;
    expect(sql).toContain('FROM staff s');
    expect(sql).toContain('LEFT JOIN admins a ON a.staff_uid = s.id');
    expect(sql).not.toMatch(/\bFROM\s+users\b/);
    expect(params).toEqual(['org-x']);
  });

  it('countOrganizationMembersByRole counts admins table', async () => {
    vi.mocked(findOrganizationById).mockResolvedValue({ id: 'org-1' } as never);
    vi.mocked(countAdmins).mockResolvedValue(3);
    await expect(countOrganizationMembersByRole('org-1', 'org_admin')).resolves.toBe(3);
    expect(countAdmins).toHaveBeenCalledOnce();
  });

  it('parseMemberDirectoryTeamsJson parses json array and string', () => {
    expect(parseMemberDirectoryTeamsJson(null)).toEqual([]);
    expect(
      parseMemberDirectoryTeamsJson([
        { is_team_lead: true, is_team_member: false, team_id: 'tid', title: 'A' },
      ])
    ).toEqual([{ is_team_lead: true, is_team_member: false, team_id: 'tid', title: 'A' }]);
    expect(
      parseMemberDirectoryTeamsJson(
        '[{"team_id":"u1","title":"B","is_team_lead":false,"is_team_member":true}]'
      )
    ).toEqual([{ is_team_lead: false, is_team_member: true, team_id: 'u1', title: 'B' }]);
  });
});
