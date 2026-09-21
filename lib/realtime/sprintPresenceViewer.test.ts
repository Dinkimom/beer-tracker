import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';

import { resolveSprintPresenceViewer, sprintPresenceViewerFromUserId } from './sprintPresenceViewer';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

describe('resolveSprintPresenceViewer', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
  });

  it('builds a fallback viewer without touching the registry', () => {
    expect(sprintPresenceViewerFromUserId('onprem-anonymous')).toEqual({
      avatarUrl: null,
      displayName: 'onprem-a',
      userId: 'onprem-anonymous',
    });
    expect(query).not.toHaveBeenCalled();
  });

  it('does not query the registry for a non-uuid session id', async () => {
    const viewer = await resolveSprintPresenceViewer('onprem-anonymous');
    expect(query).not.toHaveBeenCalled();
    expect(viewer).toEqual({
      avatarUrl: null,
      displayName: 'onprem-a',
      userId: 'onprem-anonymous',
    });
  });

  it('maps name and avatar from staff', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [
        {
          avatar_url: 'https://cdn.example/a.png',
          display_name: 'Ada Lovelace',
          user_id: '11111111-1111-4111-8111-111111111111',
        },
      ],
    } as never);

    const viewer = await resolveSprintPresenceViewer('11111111-1111-4111-8111-111111111111');
    expect(viewer).toEqual({
      avatarUrl: 'https://cdn.example/a.png',
      displayName: 'Ada Lovelace',
      userId: '11111111-1111-4111-8111-111111111111',
    });
    const [sql] = vi.mocked(query).mock.calls[0]!;
    expect(sql).toContain('FROM staff s');
    expect(sql).toContain('s.avatar_url');
  });
});
