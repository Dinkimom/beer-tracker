import type { TrackerIssue } from '@/types/tracker';

import { describe, expect, it } from 'vitest';

import { mapIssueSnapshotPayloadToTask } from './issueSnapshotMapper';
import { normalizeYandexIssue } from './yandexTrackerProvider';

const yandexSnapshotIssue: TrackerIssue = {
  CustomStoryPoints: 8,
  id: 'BT-W2-SNAPSHOT',
  key: 'BT-W2-SNAPSHOT',
  self: 'https://tracker.test/BT-W2-SNAPSHOT',
  status: { key: 'inProgress', display: 'In Progress' },
  summary: 'Snapshot issue',
} as TrackerIssue;

describe('mapIssueSnapshotPayloadToTask', () => {
  it('maps a legacy Yandex snapshot payload through the provider issue shape', () => {
    expect(
      mapIssueSnapshotPayloadToTask(yandexSnapshotIssue, {
        configRevision: 1,
        testingFlow: {
          devEstimateFieldId: 'CustomStoryPoints',
          mode: 'embedded_in_dev',
        },
      })
    ).toMatchObject({
      id: 'BT-W2-SNAPSHOT',
      name: 'Snapshot issue',
      storyPoints: 8,
    });
  });

  it('maps an already normalized provider issue snapshot', () => {
    const providerIssue = normalizeYandexIssue(yandexSnapshotIssue);

    expect(mapIssueSnapshotPayloadToTask(providerIssue)).toMatchObject({
      id: 'BT-W2-SNAPSHOT',
      name: 'Snapshot issue',
      originalStatus: 'inProgress',
    });
  });

  it('maps a Yandex snapshot envelope the same as a legacy payload', () => {
    expect(
      mapIssueSnapshotPayloadToTask({
        payload: yandexSnapshotIssue,
        provider: 'yandex-tracker',
        schemaVersion: 1,
      })
    ).toMatchObject({
      id: 'BT-W2-SNAPSHOT',
      name: 'Snapshot issue',
    });
  });

  it('maps a Jira snapshot envelope through admin estimate field ids', () => {
    expect(
      mapIssueSnapshotPayloadToTask(
        {
          payload: {
            customfield_10016: 8,
            customfield_10100: 3,
            id: '10001',
            key: 'PROJ-1',
            self: '',
            summary: 'Fix login',
          },
          provider: 'jira',
          schemaVersion: 1,
        },
        {
          configRevision: 1,
          testingFlow: {
            devEstimateFieldId: 'customfield_10016',
            mode: 'embedded_in_dev',
            qaEstimateFieldId: 'customfield_10100',
          },
        }
      )
    ).toMatchObject({
      id: 'PROJ-1',
      name: 'Fix login',
      storyPoints: 8,
      testPoints: 3,
    });
  });
});
