import { describe, expect, it } from 'vitest';

import { resolveNotificationPlannerHref } from '@/features/notifications/utils/notificationPlannerHref';

describe('resolveNotificationPlannerHref', () => {
  it('returns planner path when boardId and sprintId are present', () => {
    expect(
      resolveNotificationPlannerHref({
        boardId: 12,
        sprintId: 34,
      })
    ).toBe('/planner/12/sprint/34');
  });

  it('appends focusTask for comment mention', () => {
    expect(
      resolveNotificationPlannerHref(
        {
          boardId: 12,
          sprintId: 34,
          commentId: 'note-1',
        },
        'comment_mention'
      )
    ).toBe('/planner/12/sprint/34?focusTask=comment%3Anote-1');
  });

  it('appends focusTask for assignee change', () => {
    expect(
      resolveNotificationPlannerHref(
        {
          boardId: 12,
          sprintId: 34,
          taskId: 'DEV-987',
        },
        'assignee_changed'
      )
    ).toBe('/planner/12/sprint/34?focusTask=DEV-987');
  });

  it('returns null when boardId or sprintId is missing', () => {
    expect(resolveNotificationPlannerHref({ sprintId: 34 })).toBeNull();
    expect(resolveNotificationPlannerHref({ boardId: 12 })).toBeNull();
    expect(resolveNotificationPlannerHref({})).toBeNull();
  });
});
