import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';

import { buildStaffUpdateAssignments, findStaffById, listStaff, updateStaff } from './staffRepository';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

describe('staffRepository', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
  });

  it('listStaff reads beer_tracker.staff', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);
    await listStaff('org-1');
    const [sql, params] = vi.mocked(query).mock.calls[0]!;
    expect(sql).toMatch(/FROM\s+staff/i);
    expect(sql).toMatch(/avatar_url/);
    expect(sql).not.toMatch(/fired_at/);
    expect(params).toEqual(['org-1']);
  });

  it('findStaffById scopes by organization and uuid', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);
    await findStaffById('org-1', '11111111-1111-4111-8111-111111111111');
    const [sql, params] = vi.mocked(query).mock.calls[0]!;
    expect(sql).toMatch(/id = \$2::uuid/i);
    expect(params).toEqual(['org-1', '11111111-1111-4111-8111-111111111111']);
  });

  it('buildStaffUpdateAssignments skips undefined fields', () => {
    expect(buildStaffUpdateAssignments({ display_name: 'Ada' })).toEqual({
      assignments: ['display_name = $3'],
      values: ['Ada'],
    });
    expect(buildStaffUpdateAssignments({ email: null, tracker_user_id: '42' })).toEqual({
      assignments: ['email = $3', 'tracker_user_id = $4'],
      values: [null, '42'],
    });
    expect(buildStaffUpdateAssignments({ avatar_url: 'https://cdn.example/a.png' })).toEqual({
      assignments: ['avatar_url = $3'],
      values: ['https://cdn.example/a.png'],
    });
    expect(buildStaffUpdateAssignments({})).toEqual({ assignments: [], values: [] });
  });

  it('updateStaff writes assignments into UPDATE staff', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ id: 's1' }] } as never);
    await updateStaff('org-1', 's1', { display_name: 'Ada', email: 'ada@example.com' });
    const [sql, params] = vi.mocked(query).mock.calls[0]!;
    expect(sql).toMatch(/UPDATE\s+staff/i);
    expect(sql).toContain('display_name = $3');
    expect(sql).toContain('email = $4');
    expect(params).toEqual(['org-1', 's1', 'Ada', 'ada@example.com']);
  });
});
