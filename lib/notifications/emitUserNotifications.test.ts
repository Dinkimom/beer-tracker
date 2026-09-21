import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  emitAssigneeChangedNotification,
  emitSprintLifecycleNotification,
} from '@/lib/notifications/emitUserNotifications';
import { filterNotificationRecipientsBySprintPresence } from '@/lib/notifications/filterNotificationRecipientsBySprintPresence';
import { resolveAssigneeProductUserId } from '@/lib/notifications/resolveAssigneeProductUserId';
import { insertUserNotifications } from '@/lib/notifications/userNotificationsRepository';
import { resolveSprintPresenceViewer } from '@/lib/realtime/sprintPresenceViewer';

vi.mock('@/lib/realtime/sprintPresenceViewer', () => ({
  resolveSprintPresenceViewer: vi.fn(),
}));

vi.mock('@/lib/notifications/filterNotificationRecipientsBySprintPresence', () => ({
  filterNotificationRecipientsBySprintPresence: vi.fn(),
}));

vi.mock('@/lib/notifications/resolveAssigneeProductUserId', () => ({
  resolveAssigneeProductUserId: vi.fn(),
}));

vi.mock('@/lib/notifications/userNotificationsRepository', () => ({
  insertUserNotifications: vi.fn(),
}));

describe('emitAssigneeChangedNotification', () => {
  beforeEach(() => {
    vi.mocked(resolveSprintPresenceViewer).mockReset();
    vi.mocked(filterNotificationRecipientsBySprintPresence).mockReset();
    vi.mocked(resolveAssigneeProductUserId).mockReset();
    vi.mocked(insertUserNotifications).mockReset();
    vi.mocked(resolveSprintPresenceViewer).mockResolvedValue({
      userId: 'actor',
      displayName: 'Anna Petrova',
      avatarUrl: null,
    });
    vi.mocked(resolveAssigneeProductUserId).mockResolvedValue('recipient-1');
    vi.mocked(filterNotificationRecipientsBySprintPresence).mockResolvedValue(['recipient-1']);
  });

  it('does nothing when assignee unchanged', async () => {
    await emitAssigneeChangedNotification({
      actorUserId: 'actor',
      assigneeId: 'dev-1',
      organizationId: 'org-1',
      previousAssigneeId: 'dev-1',
      sprintId: 10,
      taskId: 'PROJ-1',
    });

    expect(insertUserNotifications).not.toHaveBeenCalled();
  });

  it('filters recipients by sprint presence before insert', async () => {
    await emitAssigneeChangedNotification({
      actorUserId: 'actor',
      assigneeId: 'dev-1',
      organizationId: 'org-1',
      previousAssigneeId: 'dev-0',
      sprintId: 10,
      taskId: 'PROJ-1',
    });

    expect(filterNotificationRecipientsBySprintPresence).toHaveBeenCalledWith({
      organizationId: 'org-1',
      recipientUserIds: ['recipient-1'],
      sprintId: 10,
    });
    expect(insertUserNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ actorName: 'Anna Petrova', taskId: 'PROJ-1' }),
      })
    );
  });

  it('does not notify when assignee is the actor', async () => {
    vi.mocked(resolveAssigneeProductUserId).mockResolvedValue('actor');

    await emitAssigneeChangedNotification({
      actorUserId: 'actor',
      assigneeId: 'dev-1',
      organizationId: 'org-1',
      previousAssigneeId: 'dev-0',
      sprintId: 10,
      taskId: 'PROJ-1',
    });

    expect(filterNotificationRecipientsBySprintPresence).not.toHaveBeenCalled();
    expect(insertUserNotifications).not.toHaveBeenCalled();
  });
});

describe('emitSprintLifecycleNotification', () => {
  beforeEach(() => {
    vi.mocked(resolveSprintPresenceViewer).mockReset();
    vi.mocked(filterNotificationRecipientsBySprintPresence).mockReset();
    vi.mocked(insertUserNotifications).mockReset();
    vi.mocked(resolveSprintPresenceViewer).mockResolvedValue({
      userId: 'actor',
      displayName: 'Actor',
      avatarUrl: null,
    });
    vi.mocked(filterNotificationRecipientsBySprintPresence).mockResolvedValue([]);
  });

  it('skips insert when everyone filtered out', async () => {
    await emitSprintLifecycleNotification({
      actorUserId: 'actor',
      boardId: 1,
      kind: 'sprint_started',
      organizationId: 'org-1',
      recipientUserIds: ['user-b'],
      sprintId: 10,
      sprintName: 'Sprint 1',
    });

    expect(insertUserNotifications).not.toHaveBeenCalled();
  });
});
