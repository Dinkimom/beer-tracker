import { describe, expect, it } from 'vitest';

import { resolveNotificationFocusTaskId } from '@/features/notifications/utils/resolveNotificationFocusTaskId';

describe('resolveNotificationFocusTaskId', () => {
  it('maps comment mention to swimlane comment task id', () => {
    expect(
      resolveNotificationFocusTaskId('comment_mention', {
        commentId: 'abc-123',
      })
    ).toBe('comment:abc-123');
  });

  it('returns assignee task id for assignee_changed', () => {
    expect(
      resolveNotificationFocusTaskId('assignee_changed', {
        taskId: 'DEV-987',
      })
    ).toBe('DEV-987');
  });

  it('returns null for kinds without a focus target', () => {
    expect(resolveNotificationFocusTaskId('sprint_started', { sprintName: 'S1' })).toBeNull();
  });
});
