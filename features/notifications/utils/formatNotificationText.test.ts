import { describe, expect, it } from 'vitest';

import {
  formatNotificationBody,
  getNotificationActorDisplayName,
} from '@/features/notifications/components/NotificationListItemMessage';

const messages: Record<string, string> = {
  'notifications.someone': 'Someone',
  'notifications.messages.assigneeChangedAction': 'assigned you task',
  'notifications.messages.sprintStartedAction': 'started sprint {sprintName}',
  'notifications.eventTypes.vacation': 'Vacation',
  'notifications.eventTypes.other': 'Availability',
  'notifications.messages.availabilityChangedAction':
    'updated {memberName}: {eventType} ({startDate} – {endDate})',
};

const t = (key: string, params?: Record<string, number | string>) => {
  let value = messages[key] ?? key;
  if (params) {
    for (const [name, paramValue] of Object.entries(params)) {
      value = value.replace(`{${name}}`, String(paramValue));
    }
  }
  return value;
};

describe('getNotificationActorDisplayName', () => {
  it('prefers actorDisplayName from dto', () => {
    expect(
      getNotificationActorDisplayName(
        { actorDisplayName: 'Anna Petrova', payload: { actorName: 'anna' } },
        t
      )
    ).toBe('Anna Petrova');
  });

  it('falls back to payload actorName and someone', () => {
    expect(getNotificationActorDisplayName({ payload: { actorName: 'Anna' } }, t)).toBe('Anna');
    expect(getNotificationActorDisplayName({ payload: {} }, t)).toBe('Someone');
  });
});

describe('formatNotificationBody', () => {
  it('formats assignee_changed action without task id', () => {
    expect(formatNotificationBody('assignee_changed', { taskId: 'PROJ-1' }, t)).toBe(
      'assigned you task'
    );
  });

  it('formats sprint_started', () => {
    expect(formatNotificationBody('sprint_started', { sprintName: 'Sprint 42' }, t)).toBe(
      'started sprint Sprint 42'
    );
  });
});
