import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  emitAvailabilityChangedNotification,
  emitSprintLifecycleNotification,
} from '@/lib/notifications/emitUserNotifications';
import { listBoardTeamRecipientUserIds } from '@/lib/notifications/listBoardTeamRecipientUserIds';
import {
  notifyAvailabilityChangedIfNeeded,
  notifySprintLifecycleIfNeeded,
} from '@/lib/notifications/notifyLifecycleAndAvailability';

vi.mock('@/lib/notifications/listBoardTeamRecipientUserIds', () => ({
  listBoardTeamRecipientUserIds: vi.fn(),
}));

vi.mock('@/lib/notifications/emitUserNotifications', () => ({
  emitAvailabilityChangedNotification: vi.fn(),
  emitSprintLifecycleNotification: vi.fn(),
}));

describe('notifySprintLifecycleIfNeeded', () => {
  beforeEach(() => {
    vi.mocked(listBoardTeamRecipientUserIds).mockReset();
    vi.mocked(emitSprintLifecycleNotification).mockReset();
    vi.mocked(listBoardTeamRecipientUserIds).mockResolvedValue(['user-b']);
    vi.mocked(emitSprintLifecycleNotification).mockResolvedValue();
  });

  it('ignores draft status', async () => {
    notifySprintLifecycleIfNeeded({
      actorUserId: 'user-a',
      boardId: 42,
      organizationId: 'org-1',
      sprintId: 10,
      sprintName: 'Sprint 1',
      status: 'draft',
    });
    await Promise.resolve();
    expect(listBoardTeamRecipientUserIds).not.toHaveBeenCalled();
  });

  it('emits sprint_started for in_progress', async () => {
    notifySprintLifecycleIfNeeded({
      actorUserId: 'user-a',
      boardId: 42,
      organizationId: 'org-1',
      sprintId: 10,
      sprintName: 'Sprint 1',
      status: 'in_progress',
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(emitSprintLifecycleNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'sprint_started',
        recipientUserIds: ['user-b'],
        sprintName: 'Sprint 1',
      })
    );
  });
});

describe('notifyAvailabilityChangedIfNeeded', () => {
  beforeEach(() => {
    vi.mocked(listBoardTeamRecipientUserIds).mockReset();
    vi.mocked(emitAvailabilityChangedNotification).mockReset();
    vi.mocked(listBoardTeamRecipientUserIds).mockResolvedValue(['user-b']);
    vi.mocked(emitAvailabilityChangedNotification).mockResolvedValue();
  });

  it('notifies board team with SSE filtering in emit layer', async () => {
    notifyAvailabilityChangedIfNeeded({
      actorUserId: 'user-a',
      boardId: 42,
      endDate: '2026-09-05',
      eventType: 'vacation',
      memberId: 'staff-1',
      memberName: 'Ivan',
      organizationId: 'org-1',
      startDate: '2026-09-01',
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(emitAvailabilityChangedNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'vacation',
        memberName: 'Ivan',
        recipientUserIds: ['user-b'],
      })
    );
  });
});
