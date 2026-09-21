import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';

import {
  getStaffByTrackerUserIdInOrg,
  getStaffByTrackerUserIdsInOrg,
  searchStaffInOrg,
} from './teamMembersQuery';

vi.mock('@/lib/db', async () => {
  const actual = await vi.importActual('@/lib/db');
  return {
    ...(actual as object),
    query: vi.fn(),
  };
});

const staffRow = {
  id: '22222222-2222-4222-8222-222222222222',
  tracker_user_id: '1000000000000001',
  display_name: 'Alex Smith',
  email: 'alex.smith@example.com',
  avatar_link: 'https://example.com/avatar.jpg',
};

describe('teamMembersQuery staff email', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
  });

  it('getStaffByTrackerUserIdInOrg returns email from beer_tracker.staff', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [staffRow],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });

    const item = await getStaffByTrackerUserIdInOrg('org-1', '1000000000000001');

    expect(item?.email).toBe('alex.smith@example.com');
    expect(item?.staffUid).toBe('22222222-2222-4222-8222-222222222222');
    expect(item?.displayName).toBe('Alex Smith');
    const sql = String(vi.mocked(query).mock.calls[0]?.[0] ?? '');
    expect(sql).toMatch(/\bFROM\s+staff\b/i);
    expect(sql).not.toMatch(/registry_employees/i);
  });

  it('searchStaffInOrg returns email and searches by email', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [staffRow],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });

    const items = await searchStaffInOrg('org-1', 'smith');

    expect(items).toHaveLength(1);
    expect(items[0]?.email).toBe('alex.smith@example.com');
    const sql = String(vi.mocked(query).mock.calls[0]?.[0] ?? '');
    expect(sql).toMatch(/COALESCE\(s\.email,\s*''\)\s+ILIKE/i);
  });

  it('getStaffByTrackerUserIdsInOrg returns email for batch lookup', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [staffRow],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });

    const items = await getStaffByTrackerUserIdsInOrg('org-1', ['1000000000000001']);

    expect(items[0]?.email).toBe('alex.smith@example.com');
  });
});
