import { beforeEach, describe, expect, it, vi } from 'vitest';

import { findUserById } from '@/lib/auth/userRepository';
import { query } from '@/lib/db';

import { listUserTeamMembershipsInOrganization } from './userTeamMembershipRepository';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

vi.mock('@/lib/auth/userRepository', () => ({
  findUserById: vi.fn(),
}));

describe('userTeamMembershipRepository', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
    vi.mocked(findUserById).mockReset();
  });

  it('listUserTeamMembershipsInOrganization reads team_members', async () => {
    vi.mocked(findUserById).mockResolvedValue({
      email: 'user@example.com',
      id: 'user-1',
    } as never);
    vi.mocked(query).mockResolvedValue({
      rows: [
        {
          created_at: new Date('2024-01-01T00:00:00.000Z'),
          id: 'org-1:user-1:team-a',
          is_team_lead: false,
          is_team_member: true,
          team_id: 'team-a',
          user_id: 'user-1',
        },
      ],
    } as never);

    const rows = await listUserTeamMembershipsInOrganization('org-1', 'user-1');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.team_id).toBe('team-a');

    const [sql, params] = vi.mocked(query).mock.calls[0]!;
    expect(sql).toContain('FROM team_members tm');
    expect(sql).toContain('t.organization_id = $1::uuid');
    expect(sql).toContain('tm.staff_id = $2::uuid');
    expect(params).toEqual(['org-1', 'user-1']);
  });

  it('listUserTeamMembershipsInOrganization queries by staff id when cookie sub differs', async () => {
    vi.mocked(findUserById).mockResolvedValue({
      email: 'user@example.com',
      id: 'registry-uuid',
    } as never);
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);

    await listUserTeamMembershipsInOrganization('org-1', 'legacy-cookie-id');

    const params = vi.mocked(query).mock.calls[0]?.[1];
    expect(params).toEqual(['org-1', 'registry-uuid']);
  });
});
