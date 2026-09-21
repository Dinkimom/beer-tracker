import { describe, expect, it } from 'vitest';

import { mapIssueTrackerIssueToTask } from './mapIssueTrackerIssueToTask';

describe('mapIssueTrackerIssueToTask', () => {
  it('maps provider fields without going through a Yandex raw payload', () => {
    const task = mapIssueTrackerIssueToTask({
      customFields: { CustomStoryPoints: 8 },
      id: 'PROJ-1',
      key: 'PROJ-1',
      parent: { display: 'Epic', id: '10026', key: 'PROJ-26' },
      productTeam: ['booking'],
      provider: 'jira',
      raw: { key: 'PROJ-1', storyPoints: 99, summary: 'From raw Yandex JSON' },
      storyPoints: 3,
      summary: 'Fix login',
      type: { display: 'Task', key: 'task' },
    });
    expect(task).toMatchObject({
      id: 'PROJ-1',
      name: 'Fix login',
      parent: { key: 'PROJ-26' },
      productTeam: ['booking'],
      storyPoints: 3,
      type: 'task',
    });
    expect(task.name).not.toBe('From raw Yandex JSON');
  });

  it('reads SLA and resolvedAt from customFields, not from raw', () => {
    const task = mapIssueTrackerIssueToTask({
      customFields: {
        HD_count: 3,
        HD_growth24h: 1,
        HD_growth7d: 2,
        key_client: true,
        lastHDAt: '2026-03-09T08:00:00.000+0000',
        resolvedAt: '2026-03-11T09:00:00.000+0000',
        slaDeadline: '2026-03-15T00:00:00.000+0000',
        sup_priority: true,
      },
      id: 'BT-1',
      key: 'BT-1',
      provider: 'yandex-tracker',
      raw: { HD_count: 99, key: 'BT-1', resolvedAt: 'ignored' },
      summary: 'SLA bug',
    });
    expect(task).toMatchObject({
      hdCount: 3,
      hdGrowth24h: 1,
      hdGrowth7d: 2,
      keyClient: true,
      lastHdAt: '2026-03-09T08:00:00.000+0000',
      resolvedAt: '2026-03-11T09:00:00.000+0000',
      slaDeadline: '2026-03-15T00:00:00.000+0000',
      supPriority: true,
    });
  });

  it('reads custom estimate fields from customFields for integration mapping', () => {
    const task = mapIssueTrackerIssueToTask(
      {
        customFields: { CustomStoryPoints: 8 },
        id: 'BT-1',
        key: 'BT-1',
        provider: 'yandex-tracker',
        summary: 'Mapped custom issue',
      },
      {
        configRevision: 1,
        testingFlow: {
          devEstimateFieldId: 'CustomStoryPoints',
          mode: 'embedded_in_dev',
        },
      }
    );
    expect(task).toMatchObject({
      id: 'BT-1',
      storyPoints: 8,
    });
  });

  it('maps start and deadline from provider issue fields', () => {
    const task = mapIssueTrackerIssueToTask({
      deadline: '2026-03-20T00:00:00.000+0000',
      id: 'BT-2',
      key: 'BT-2',
      provider: 'yandex-tracker',
      start: '2026-03-18',
      summary: 'Scheduled',
    });
    expect(task).toMatchObject({
      deadline: '2026-03-20',
      id: 'BT-2',
      start: '2026-03-18',
    });
  });
});
