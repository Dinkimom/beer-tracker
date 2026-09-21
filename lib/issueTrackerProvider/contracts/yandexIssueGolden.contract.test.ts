import type { TrackerIssue } from '@/types/tracker';

import { describe, expect, it } from 'vitest';

import { buildIssueDetailResponse } from '@/lib/issues/issueDetailRouteHelpers';

import { mapIssueSnapshotPayloadToTask } from '../issueSnapshotMapper';
import { wrapIssueSnapshotForStorage } from '../snapshotEnvelope';
import { normalizeYandexIssue } from '../yandexTrackerProvider';

import yandexIssueExpectedDetail from './fixtures/yandexIssueExpectedDetail.json';
import yandexIssueExpectedTask from './fixtures/yandexIssueExpectedTask.json';
import yandexIssueFull from './fixtures/yandexIssueFull.json';

const yandexIssue = yandexIssueFull as TrackerIssue;

const yandexChecklist = yandexIssueExpectedDetail.checklistItems;

describe('Yandex issue golden contract', () => {
  it('maps a legacy Yandex snapshot payload to the planner Task JSON', () => {
    expect(mapIssueSnapshotPayloadToTask(yandexIssue)).toEqual(yandexIssueExpectedTask);
  });

  it('maps a snapshot envelope the same way as a legacy Yandex payload', () => {
    const envelope = wrapIssueSnapshotForStorage('yandex-tracker', yandexIssue);
    expect(mapIssueSnapshotPayloadToTask(envelope)).toEqual(yandexIssueExpectedTask);
  });

  it('maps a normalized provider issue the same way as a legacy Yandex payload', () => {
    expect(mapIssueSnapshotPayloadToTask(normalizeYandexIssue(yandexIssue))).toEqual(
      yandexIssueExpectedTask
    );
  });

  it('keeps CustomStoryPoints available for tracker integration mapping', () => {
    expect(
      mapIssueSnapshotPayloadToTask(yandexIssue, {
        configRevision: 1,
        testingFlow: {
          devEstimateFieldId: 'CustomStoryPoints',
          mode: 'embedded_in_dev',
        },
      })
    ).toMatchObject({
      id: 'BT-100',
      storyPoints: 8,
    });
  });

  it('normalizes Yandex fields the UI and sync layer depend on', () => {
    expect(normalizeYandexIssue(yandexIssue)).toMatchObject({
      customFields: { CustomStoryPoints: 8 },
      key: 'BT-100',
      mergeRequestLink: 'https://gitlab.example/mr/1',
      productTeam: ['platform'],
      provider: 'yandex-tracker',
      storyPoints: 5,
      summary: 'Fix occupancy tooltip',
      testPoints: 2,
    });
  });

  it('builds the issue sidebar JSON from a Yandex snapshot payload', () => {
    expect(buildIssueDetailResponse(yandexIssue, yandexChecklist)).toEqual(
      yandexIssueExpectedDetail
    );
  });

  it('drops resolvedAt when the source is a normalized provider issue', () => {
    expect(
      buildIssueDetailResponse(normalizeYandexIssue(yandexIssue), yandexChecklist)
    ).toMatchObject({
      key: 'BT-100',
      resolvedAt: null,
      summary: 'Fix occupancy tooltip',
    });
  });

  it('maps a Jira snapshot envelope onto Task JSON', () => {
    expect(
      mapIssueSnapshotPayloadToTask(
        wrapIssueSnapshotForStorage('jira', {
          id: '10001',
          key: 'JIRA-1',
          self: '',
          summary: 'Fix login',
        })
      )
    ).toMatchObject({
      id: 'JIRA-1',
      name: 'Fix login',
    });
  });
});
