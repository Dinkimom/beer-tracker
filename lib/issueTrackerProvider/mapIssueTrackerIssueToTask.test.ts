import type { TrackerWebUrlContext } from '@/lib/issueTrackerProvider/issueTrackerUi';

import { describe, expect, it } from 'vitest';

import { mapIssueTrackerIssueToTask } from './mapIssueTrackerIssueToTask';

const TRACKER_WEB: TrackerWebUrlContext = { kind: 'tracker', webBaseUrl: 'https://tracker.yandex.ru' };

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
    }, TRACKER_WEB);
    expect(task).toMatchObject({
      id: 'PROJ-1',
      name: 'Fix login',
      parent: { key: 'PROJ-26' },
      productTeam: ['booking'],
      storyPoints: 3,
      type: 'task',
    });
    expect(task.name).not.toBe('From raw Yandex JSON');
    expect(task.customFieldValues).toEqual({ CustomStoryPoints: '8' });
  });

  it('reads resolvedAt from customFields, not from raw', () => {
    const task = mapIssueTrackerIssueToTask({
      customFields: {
        resolvedAt: '2026-03-11T09:00:00.000+0000',
      },
      id: 'BT-1',
      key: 'BT-1',
      provider: 'yandex-tracker',
      raw: { key: 'BT-1', resolvedAt: 'ignored' },
      summary: 'Bug',
    }, TRACKER_WEB);
    expect(task.resolvedAt).toBe('2026-03-11T09:00:00.000+0000');
  });

  it('reads custom estimate fields from customFields for integration mapping', () => {
    const task = mapIssueTrackerIssueToTask(
      {
        customFields: { CustomStoryPoints: 8 },
        id: 'BT-1',
        key: 'BT-1',
        provider: 'yandex-tracker',
        summary: 'Mapped custom issue',
      }, TRACKER_WEB,
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

  it('reads the standalone estimate field for development tasks', () => {
    const task = mapIssueTrackerIssueToTask(
      {
        customFields: { CustomStoryPoints: 8 },
        id: 'BT-2',
        key: 'BT-2',
        provider: 'yandex-tracker',
        summary: 'Dev issue',
        type: { display: 'Task', key: 'task' },
      },
      TRACKER_WEB,
      {
        configRevision: 1,
        testingFlow: {
          devEstimateFieldId: 'CustomStoryPoints',
          mode: 'standalone_qa_tasks',
          standaloneClassification: { typeKeys: ['qaTask'] },
        },
      }
    );
    expect(task).toMatchObject({
      hideTestPointsByIntegration: true,
      id: 'BT-2',
      storyPoints: 8,
    });
  });

  it('keeps the tracker status label separate from the normalized key', () => {
    const task = mapIssueTrackerIssueToTask({
      id: 'PROJ-3',
      key: 'PROJ-3',
      provider: 'jira',
      status: { display: 'В процессе проверки', key: 'впроцессепроверки' },
      summary: 'Review',
    }, TRACKER_WEB);
    expect(task).toMatchObject({
      originalStatus: 'впроцессепроверки',
      originalStatusDisplay: 'В процессе проверки',
    });
  });

  it('omits the status label when it matches the key', () => {
    const task = mapIssueTrackerIssueToTask({
      id: 'BT-3',
      key: 'BT-3',
      provider: 'yandex-tracker',
      status: { display: 'inProgress', key: 'inProgress' },
      summary: 'Same',
    }, TRACKER_WEB);
    expect(task.originalStatus).toBe('inProgress');
    expect(task.originalStatusDisplay).toBeUndefined();
  });

  it('maps start and deadline from provider issue fields', () => {
    const task = mapIssueTrackerIssueToTask({
      deadline: '2026-03-20T00:00:00.000+0000',
      id: 'BT-2',
      key: 'BT-2',
      provider: 'yandex-tracker',
      start: '2026-03-18',
      summary: 'Scheduled',
    }, TRACKER_WEB);
    expect(task).toMatchObject({
      deadline: '2026-03-20',
      id: 'BT-2',
      start: '2026-03-18',
    });
  });
});
