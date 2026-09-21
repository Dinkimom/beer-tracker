import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pool, query } from '@/lib/db';

import { removeTeamMember } from './teamMembersRepository';

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

describe('removeTeamMember', () => {
  beforeEach(() => {
    vi.mocked(pool.connect).mockReset();
    vi.mocked(query).mockReset();
  });

  it('deletes beer_tracker.team_members', async () => {
    vi.mocked(query).mockResolvedValue({ rowCount: 1 } as never);

    const ok = await removeTeamMember(
      'org-1',
      '00000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000003'
    );
    expect(ok).toBe(true);
    expect(query).toHaveBeenCalledTimes(1);
    const sql = String(vi.mocked(query).mock.calls[0]?.[0] ?? '');
    expect(sql).toMatch(/DELETE\s+FROM\s+team_members/i);
    expect(sql).not.toMatch(/overseer\.staff_teams/i);
    expect(pool.connect).not.toHaveBeenCalled();
  });
});
