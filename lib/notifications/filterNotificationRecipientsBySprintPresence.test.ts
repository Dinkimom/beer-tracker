import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listSprintPresenceUserIds } from '@/lib/realtime/sprintPresence';

import { filterNotificationRecipientsBySprintPresence } from './filterNotificationRecipientsBySprintPresence';

vi.mock('@/lib/realtime/sprintPresence', () => ({
  listSprintPresenceUserIds: vi.fn(),
}));

describe('filterNotificationRecipientsBySprintPresence', () => {
  beforeEach(() => {
    vi.mocked(listSprintPresenceUserIds).mockReset();
  });

  it('drops users who are online in the sprint', async () => {
    vi.mocked(listSprintPresenceUserIds).mockResolvedValue(['user-a', 'user-b']);

    await expect(
      filterNotificationRecipientsBySprintPresence({
        organizationId: 'org-1',
        recipientUserIds: ['user-a', 'user-b', 'user-c'],
        sprintId: 10,
      })
    ).resolves.toEqual(['user-c']);
  });

  it('drops other users who are online in the sprint', async () => {
    vi.mocked(listSprintPresenceUserIds).mockResolvedValue(['user-b']);

    await expect(
      filterNotificationRecipientsBySprintPresence({
        organizationId: 'org-1',
        recipientUserIds: ['user-b', 'user-c'],
        sprintId: 10,
      })
    ).resolves.toEqual(['user-c']);
  });

  it('skips SSE lookup when sprintId is missing', async () => {
    await expect(
      filterNotificationRecipientsBySprintPresence({
        organizationId: 'org-1',
        recipientUserIds: ['user-a', 'user-b'],
      })
    ).resolves.toEqual(['user-a', 'user-b']);
    expect(listSprintPresenceUserIds).not.toHaveBeenCalled();
  });
});
