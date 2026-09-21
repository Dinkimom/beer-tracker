import { beforeEach, describe, expect, it, vi } from 'vitest';

import { emitCommentMentionNotifications } from '@/lib/notifications/emitUserNotifications';
import { filterNotificationRecipientsBySprintPresence } from '@/lib/notifications/filterNotificationRecipientsBySprintPresence';
import { resolveMentionAssigneeIdsToProductUserIds } from '@/lib/notifications/resolveMentionAssigneeProductUserIds';
import { insertUserNotifications } from '@/lib/notifications/userNotificationsRepository';
import { resolveSprintPresenceViewer } from '@/lib/realtime/sprintPresenceViewer';

import { notifyCommentMentionsIfNeeded } from './notifyCommentMentionsIfNeeded';

vi.mock('@/lib/realtime/sprintPresenceViewer', () => ({
  resolveSprintPresenceViewer: vi.fn(),
}));

vi.mock('@/lib/notifications/filterNotificationRecipientsBySprintPresence', () => ({
  filterNotificationRecipientsBySprintPresence: vi.fn(),
}));

vi.mock('@/lib/notifications/resolveMentionAssigneeProductUserIds', () => ({
  resolveMentionAssigneeIdsToProductUserIds: vi.fn(),
}));

vi.mock('@/lib/notifications/userNotificationsRepository', () => ({
  insertUserNotifications: vi.fn(),
}));

describe('notifyCommentMentionsIfNeeded', () => {
  beforeEach(() => {
    vi.mocked(resolveSprintPresenceViewer).mockReset();
    vi.mocked(filterNotificationRecipientsBySprintPresence).mockReset();
    vi.mocked(resolveMentionAssigneeIdsToProductUserIds).mockReset();
    vi.mocked(insertUserNotifications).mockReset();
    vi.mocked(resolveSprintPresenceViewer).mockResolvedValue({
      userId: 'actor',
      displayName: 'Actor',
      avatarUrl: null,
    });
    vi.mocked(resolveMentionAssigneeIdsToProductUserIds).mockResolvedValue(['recipient-1']);
    vi.mocked(filterNotificationRecipientsBySprintPresence).mockResolvedValue(['recipient-1']);
  });

  it('does nothing when text has no mentions', async () => {
    notifyCommentMentionsIfNeeded({
      actorUserId: 'actor',
      commentId: 'comment-1',
      isUpdate: false,
      organizationId: 'org-1',
      sprintId: 10,
      text: 'plain note',
    });

    await Promise.resolve();
    expect(insertUserNotifications).not.toHaveBeenCalled();
  });

  it('inserts comment_mention notification for parsed mentions', async () => {
    notifyCommentMentionsIfNeeded({
      actorUserId: 'actor',
      commentId: 'comment-1',
      isUpdate: false,
      organizationId: 'org-1',
      sprintId: 10,
      text: 'Hi @[Anna](dev-1)',
    });

    await vi.waitFor(() => {
      expect(insertUserNotifications).toHaveBeenCalled();
    });

    expect(resolveMentionAssigneeIdsToProductUserIds).toHaveBeenCalledWith('org-1', ['dev-1']);
    expect(insertUserNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'comment_mention',
        recipientUserIds: ['recipient-1'],
        payload: expect.objectContaining({
          commentId: 'comment-1',
          commentPreview: 'Hi @Anna',
          sprintId: 10,
        }),
      })
    );
  });

  it('notifies only newly added mentions on edit', async () => {
    notifyCommentMentionsIfNeeded({
      actorUserId: 'actor',
      commentId: 'comment-1',
      isUpdate: true,
      organizationId: 'org-1',
      previousText: 'Hi @[Anna](dev-1)',
      sprintId: 10,
      text: 'Hi @[Anna](dev-1) cc @[Ivan](dev-2)',
    });

    await vi.waitFor(() => {
      expect(resolveMentionAssigneeIdsToProductUserIds).toHaveBeenCalledWith('org-1', ['dev-2']);
    });
  });
});

describe('emitCommentMentionNotifications', () => {
  beforeEach(() => {
    vi.mocked(resolveSprintPresenceViewer).mockReset();
    vi.mocked(filterNotificationRecipientsBySprintPresence).mockReset();
    vi.mocked(resolveMentionAssigneeIdsToProductUserIds).mockReset();
    vi.mocked(insertUserNotifications).mockReset();
    vi.mocked(resolveSprintPresenceViewer).mockResolvedValue({
      userId: 'actor',
      displayName: 'Actor',
      avatarUrl: null,
    });
    vi.mocked(resolveMentionAssigneeIdsToProductUserIds).mockResolvedValue(['actor', 'other']);
    vi.mocked(filterNotificationRecipientsBySprintPresence).mockResolvedValue(['other']);
  });

  it('does not notify the actor on self-mention', async () => {
    await emitCommentMentionNotifications({
      actorUserId: 'actor',
      commentId: 'comment-1',
      commentPreview: 'note',
      mentionAssigneeIds: ['dev-1'],
      organizationId: 'org-1',
      sprintId: 10,
    });

    expect(filterNotificationRecipientsBySprintPresence).toHaveBeenCalledWith({
      organizationId: 'org-1',
      recipientUserIds: ['other'],
      sprintId: 10,
    });
    expect(insertUserNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserIds: ['other'],
      })
    );
  });

  it('skips insert when only the actor is mentioned', async () => {
    vi.mocked(resolveMentionAssigneeIdsToProductUserIds).mockResolvedValue(['actor']);

    await emitCommentMentionNotifications({
      actorUserId: 'actor',
      commentId: 'comment-1',
      commentPreview: 'note',
      mentionAssigneeIds: ['dev-1'],
      organizationId: 'org-1',
      sprintId: 10,
    });

    expect(filterNotificationRecipientsBySprintPresence).not.toHaveBeenCalled();
    expect(insertUserNotifications).not.toHaveBeenCalled();
  });
});
