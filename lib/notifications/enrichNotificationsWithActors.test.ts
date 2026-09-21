import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';

import { enrichNotificationsWithActors } from './enrichNotificationsWithActors';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

describe('enrichNotificationsWithActors', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
  });

  it('returns actor fields from registry rows', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [
        {
          user_id: 'user-a',
          display_name: 'Anna Petrova',
          avatar_url: 'https://example.com/a.jpg',
        },
      ],
    } as never);

    const result = await enrichNotificationsWithActors([
      {
        id: 'n-1',
        kind: 'assignee_changed',
        payload: { taskId: 'PROJ-1', actorName: 'anna' },
        actorUserId: 'user-a',
        readAt: null,
        createdAt: '2026-08-29T10:00:00.000Z',
      },
    ]);

    expect(result[0]).toMatchObject({
      actorDisplayName: 'Anna Petrova',
      actorAvatarUrl: 'https://example.com/a.jpg',
    });
    expect(vi.mocked(query).mock.calls[0]?.[1]?.[0]).toEqual(['user-a']);
  });

  it('falls back to payload actorName when registry row missing', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);

    const result = await enrichNotificationsWithActors([
      {
        id: 'n-1',
        kind: 'sprint_started',
        payload: { actorName: 'Legacy Name', sprintName: 'S1' },
        actorUserId: 'user-a',
        readAt: null,
        createdAt: '2026-08-29T10:00:00.000Z',
      },
    ]);

    expect(result[0]?.actorDisplayName).toBe('Legacy Name');
    expect(result[0]?.actorAvatarUrl).toBeNull();
  });
});
