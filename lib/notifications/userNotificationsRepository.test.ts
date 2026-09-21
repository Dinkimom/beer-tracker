import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';

import {
  countUnreadUserNotifications,
  deleteAllUserNotifications,
  deleteUserNotification,
  insertUserNotifications,
  listUserNotifications,
  markAllUserNotificationsRead,
  markUserNotificationRead,
} from './userNotificationsRepository';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

vi.mock('@/lib/notifications/ensureUserNotificationsTable', () => ({
  ensureUserNotificationsTable: vi.fn().mockResolvedValue(undefined),
}));

describe('insertUserNotifications', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);
  });

  it('inserts for actor when they are the only recipient', async () => {
    await insertUserNotifications({
      organizationId: 'org-1',
      actorUserId: 'user-a',
      kind: 'sprint_started',
      recipientUserIds: ['user-a'],
      payload: { sprintName: 'S1' },
    });

    expect(vi.mocked(query)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(query).mock.calls[0]?.[1]?.[1]).toBe('user-a');
  });

  it('deduplicates recipient ids', async () => {
    await insertUserNotifications({
      organizationId: 'org-1',
      kind: 'availability_changed',
      recipientUserIds: ['user-b', 'user-b'],
      payload: { memberName: 'Ivan' },
    });

    expect(vi.mocked(query)).toHaveBeenCalledTimes(1);
  });
});

describe('listUserNotifications', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
  });

  it('maps rows to dto', async () => {
    const createdAt = new Date('2026-08-29T10:00:00.000Z');
    vi.mocked(query).mockResolvedValue({
      rows: [
        {
          id: 'n-1',
          organization_id: 'org-1',
          recipient_user_id: 'user-b',
          actor_user_id: 'user-a',
          kind: 'assignee_changed',
          payload: { taskId: 'PROJ-1' },
          read_at: null,
          created_at: createdAt,
        },
      ],
    } as never);

    const items = await listUserNotifications({
      organizationId: 'org-1',
      recipientUserId: 'user-b',
    });

    expect(items).toEqual([
      {
        id: 'n-1',
        kind: 'assignee_changed',
        payload: { taskId: 'PROJ-1' },
        actorUserId: 'user-a',
        readAt: null,
        createdAt: createdAt.toISOString(),
      },
    ]);
  });

  it('clamps limit to 100', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);
    await listUserNotifications({
      organizationId: 'org-1',
      recipientUserId: 'user-b',
      limit: 500,
    });
    expect(vi.mocked(query).mock.calls[0]?.[1]?.[2]).toBe(100);
  });
});

describe('countUnreadUserNotifications', () => {
  it('parses count from postgres text', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ count: '3' }] } as never);
    await expect(
      countUnreadUserNotifications({ organizationId: 'org-1', recipientUserId: 'user-b' })
    ).resolves.toBe(3);
  });
});

describe('markAllUserNotificationsRead', () => {
  it('returns number of updated rows', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ id: '1' }, { id: '2' }] } as never);
    await expect(
      markAllUserNotificationsRead({ organizationId: 'org-1', recipientUserId: 'user-b' })
    ).resolves.toBe(2);
  });
});

describe('markUserNotificationRead', () => {
  it('returns false when notification not found', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);
    await expect(
      markUserNotificationRead({
        notificationId: 'missing',
        organizationId: 'org-1',
        recipientUserId: 'user-b',
      })
    ).resolves.toBe(false);
  });
});

describe('deleteAllUserNotifications', () => {
  it('returns deleted row count', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ id: '1' }, { id: '2' }, { id: '3' }] } as never);
    await expect(
      deleteAllUserNotifications({ organizationId: 'org-1', recipientUserId: 'user-b' })
    ).resolves.toBe(3);
  });
});

describe('deleteUserNotification', () => {
  it('returns false when notification not found', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);
    await expect(
      deleteUserNotification({
        notificationId: 'missing',
        organizationId: 'org-1',
        recipientUserId: 'user-b',
      })
    ).resolves.toBe(false);
  });
});
