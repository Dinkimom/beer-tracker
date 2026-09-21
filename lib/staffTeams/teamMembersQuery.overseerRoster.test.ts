import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';

import { fetchAllTeamMembersForOrg, fetchTeamMembersByBoardIdForOrg } from './teamMembersQuery';
import { getTeamByBoardId } from './teamsRepository';

vi.mock('@/lib/db', async () => {
  const actual = await vi.importActual('@/lib/db');
  return {
    ...(actual as object),
    query: vi.fn(),
  };
});

vi.mock('./teamsRepository', () => ({
  getTeamByBoardId: vi.fn(),
}));

describe('teamMembersQuery roster', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
    vi.mocked(getTeamByBoardId).mockReset();
  });

  it('fetchTeamMembersByBoardIdForOrg reads beer_tracker.team_members', async () => {
    vi.mocked(getTeamByBoardId).mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000002',
      organization_id: '00000000-0000-4000-8000-000000000001',
      slug: 'platform',
      title: 'Platform',
      tracker_queue_key: 'PLATFORM',
      tracker_board_id: '42',
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
    vi.mocked(query).mockResolvedValue({
      rows: [
        {
          role_slug: 'backend',
          staff_id: '00000000-0000-4000-8000-000000000003',
          staff_display_name: 'Ada Lovelace',
          staff_email: 'ada@example.com',
          staff_avatar_url: null,
          staff_tracker_user_id: '42',
          staff_manual_override_flags: null,
          team_id: '00000000-0000-4000-8000-000000000002',
          team_slug: 'platform',
          team_title: 'Platform',
          team_tracker_queue_key: 'PLATFORM',
          team_tracker_board_id: '42',
          team_active: true,
        },
      ],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });

    const members = await fetchTeamMembersByBoardIdForOrg(
      '00000000-0000-4000-8000-000000000001',
      42
    );

    expect(members).toHaveLength(1);
    expect(members[0]?.displayName).toBe('Ada Lovelace');
    const sql = String(vi.mocked(query).mock.calls[0]?.[0] ?? '');
    expect(sql).toMatch(/\bteam_members\b/i);
    expect(sql).toMatch(/\bstaff\b/i);
    expect(sql).toContain('s.avatar_url');
    expect(sql).not.toMatch(/\boverseer\.staff_teams\b/i);
  });

  it('fetchAllTeamMembersForOrg reads beer_tracker.team_members', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [],
      rowCount: 0,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });

    await fetchAllTeamMembersForOrg('00000000-0000-4000-8000-000000000001');

    const sql = String(vi.mocked(query).mock.calls[0]?.[0] ?? '');
    expect(sql).toMatch(/\bteam_members\b/i);
    expect(sql).not.toMatch(/\boverseer\.staff_teams\b/i);
  });
});
