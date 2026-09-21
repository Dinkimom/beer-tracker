import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';

import {
  resolvePlannerAssigneeIdForTrackerSync,
  resolvePlannerAssigneeIdsForTrackerSync,
} from './resolvePlannerAssigneeForTrackerSync';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

const mockQuery = vi.mocked(query);

describe('resolvePlannerAssigneeForTrackerSync', () => {
  const org = '00000000-0000-4000-8000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('возвращает тот же id, если это не staff:', async () => {
    const r = await resolvePlannerAssigneeIdForTrackerSync(org, 'tracker-user-1');
    expect(r).toBe('tracker-user-1');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('для staff: подставляет tracker_user_id из staff', async () => {
    const staffId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: staffId, tracker_user_id: 'y-user-99' }],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    } as never);

    const r = await resolvePlannerAssigneeIdForTrackerSync(org, `staff:${staffId}`);
    expect(r).toBe('y-user-99');
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('для staff: без tracker_user_id подставляет email', async () => {
    const staffId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    mockQuery.mockResolvedValueOnce({
      rows: [{ email: 'ada@corp.example', id: staffId, tracker_user_id: null }],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    } as never);

    const r = await resolvePlannerAssigneeIdForTrackerSync(org, `staff:${staffId}`);
    expect(r).toBe('ada@corp.example');
  });

  it('для staff: без tracker_user_id и email возвращает null', async () => {
    const staffId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    mockQuery.mockResolvedValueOnce({
      rows: [{ email: null, id: staffId, tracker_user_id: null }],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    } as never);

    const r = await resolvePlannerAssigneeIdForTrackerSync(org, `staff:${staffId}`);
    expect(r).toBeNull();
  });

  it('batch: один запрос на несколько staff id', async () => {
    const s1 = 'aaaaaaaa-bbbb-cccc-dddd-000000000001';
    const s2 = 'aaaaaaaa-bbbb-cccc-dddd-000000000002';
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: s1, tracker_user_id: 't1' },
        { id: s2, tracker_user_id: 't2' },
      ],
      rowCount: 2,
      command: 'SELECT',
      oid: 0,
      fields: [],
    } as never);

    const m = await resolvePlannerAssigneeIdsForTrackerSync(org, [
      `staff:${s1}`,
      'plain',
      `staff:${s2}`,
    ]);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(m.get(`staff:${s1}`)).toBe('t1');
    expect(m.get('plain')).toBe('plain');
    expect(m.get(`staff:${s2}`)).toBe('t2');
  });
});
