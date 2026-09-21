import { describe, expect, it } from 'vitest';

import {
  buildSlaBugsArrivedSinceQuery,
  buildSlaBugsClosedSinceQuery,
  formatTrackerApiDateTimeUtc,
  mapTrackerIssueToTask,
} from './issues';

describe('formatTrackerApiDateTimeUtc', () => {
  it('formats as Tracker API datetime with +0000 offset', () => {
    const d = new Date('2026-04-05T19:55:26.042Z');
    expect(formatTrackerApiDateTimeUtc(d)).toBe('2026-04-05T19:55:26.042+0000');
  });
});

describe('SLA bugs weekly queries', () => {
  it('buildSlaBugsArrivedSinceQuery filters by Created date', () => {
    const since = new Date('2026-06-12T00:00:00.000Z');
    expect(buildSlaBugsArrivedSinceQuery('booking', since)).toContain('Created: >= "2026-06-12"');
  });

  it('buildSlaBugsClosedSinceQuery filters by Resolved date, not Updated', () => {
    const since = new Date('2026-06-12T00:00:00.000Z');
    const query = buildSlaBugsClosedSinceQuery('booking', since);
    expect(query).toContain('Resolved: >= "2026-06-12"');
    expect(query).not.toContain('Updated:');
  });
});

describe('mapTrackerIssueToTask', () => {
  it('maps dangerousRelease string from issue', () => {
    const task = mapTrackerIssueToTask({
      id: '1',
      key: 'BT-1',
      self: 'https://tracker.yandex.ru/BT-1',
      summary: 'Task',
      dangerousRelease: 'critical',
    });
    expect(task.dangerousRelease).toBe('critical');
  });

  it('maps dangerousRelease object display from issue', () => {
    const task = mapTrackerIssueToTask({
      id: '2',
      key: 'BT-2',
      self: 'https://tracker.yandex.ru/BT-2',
      summary: 'Task',
      dangerousRelease: { display: 'High risk', key: 'high' },
    });
    expect(task.dangerousRelease).toBe('High risk');
  });

  it('maps description by default', () => {
    const task = mapTrackerIssueToTask({
      id: '3',
      key: 'BT-3',
      self: 'https://tracker.yandex.ru/BT-3',
      summary: 'Task',
      description: 'Long markdown body',
    });
    expect(task.description).toBe('Long markdown body');
  });

  it('does not read description onto the planner list DTO', () => {
    const task = mapTrackerIssueToTask(
      {
        id: '4',
        key: 'BT-4',
        self: 'https://tracker.yandex.ru/BT-4',
        summary: 'Task',
        description: 'Long markdown body',
      },
      null,
      { omitDescription: true }
    );
    expect(task).not.toHaveProperty('description');
  });

  it('stringifies numeric parent and epic ids', () => {
    const task = mapTrackerIssueToTask({
      epic: { display: 'Epic', id: 55 as never, key: 'EP-1', self: '' },
      id: '5',
      key: 'BT-5',
      parent: { display: 'Story', id: 10010 as never, key: 'ST-1', self: '' },
      self: 'https://tracker.yandex.ru/BT-5',
      summary: 'Task',
    });
    expect(task.parent).toEqual({ display: 'Story', id: '10010', key: 'ST-1' });
    expect(task.epic).toEqual({ display: 'Epic', id: '55', key: 'EP-1' });
  });
});
