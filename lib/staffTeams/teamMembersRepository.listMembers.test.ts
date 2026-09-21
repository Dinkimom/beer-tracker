import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';

import { listTeamMembersWithStaff } from './teamMembersRepository';

vi.mock('@/lib/db', async () => {
  const actual = await vi.importActual('@/lib/db');
  return {
    ...(actual as object),
    query: vi.fn(),
    pool: {
      connect: vi.fn(),
    },
  };
});

describe('listTeamMembersWithStaff', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
  });

  it('reads members from beer_tracker.team_members', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [
        {
          team_id: '00000000-0000-4000-8000-000000000002',
          staff_id: '00000000-0000-4000-8000-000000000003',
          role_slug: 'backend',
          staff_display_name: 'Ada Lovelace',
          staff_email: 'ada@example.com',
          staff_avatar_url: 'https://example.com/ada.png',
          staff_tracker_user_id: '42',
          product_user_id: '00000000-0000-4000-8000-000000000003',
          product_planner_is_team_lead: false,
          product_user_in_org: true,
          product_team_access: true,
          pending_product_invitation: false,
        },
      ],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });

    const members = await listTeamMembersWithStaff(
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002'
    );

    expect(members).toHaveLength(1);
    expect(members[0]?.staff_display_name).toBe('Ada Lovelace');
    expect(query).toHaveBeenCalledTimes(1);
    const sql = String(vi.mocked(query).mock.calls[0]?.[0] ?? '');
    expect(sql).toMatch(/\bFROM\s+teams\b/i);
    expect(sql).toMatch(/\bteam_members\b/i);
    expect(sql).toMatch(/\bstaff\b/i);
    expect(sql).not.toMatch(/\boverseer\.staff_teams\b/i);
    expect(sql).not.toMatch(/\bpublic\.registry_employees\b/i);
  });
});
