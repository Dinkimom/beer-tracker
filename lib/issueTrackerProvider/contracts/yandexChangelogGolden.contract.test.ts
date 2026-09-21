import type { TrackerIssue } from '@/types/tracker';

import { describe, expect, it } from 'vitest';

import {
  buildIssueTrackerBurndownIssueFromPayloadAndLogs,
  changelogEntriesFromRawIssueLogs,
} from '../changelogNormalizer';

import yandexChangelogLogs from './fixtures/yandexChangelogLogs.json';
import yandexIssueFull from './fixtures/yandexIssueFull.json';

const yandexIssue = yandexIssueFull as TrackerIssue;

describe('Yandex changelog golden contract', () => {
  it('normalizes Yandex issue logs into UI changelog entries', () => {
    expect(changelogEntriesFromRawIssueLogs(yandexChangelogLogs)).toEqual([
      {
        createdBy: { display: 'Ada', id: 'user-42' },
        fields: [
          {
            field: { display: 'Status', id: 'status' },
            from: { display: 'Open', id: '1', key: 'open' },
            to: { display: 'In Progress', id: '2', key: 'inProgress' },
          },
        ],
        id: 'log-1',
        type: 'IssueUpdate',
        updatedAt: '2026-01-01T10:00:00.000Z',
      },
      {
        fields: [
          {
            field: { display: 'Status', id: 'status' },
            from: { display: 'In Progress', id: '2', key: 'inProgress' },
            to: { display: 'Closed', id: '3', key: 'closed' },
          },
        ],
        id: 'log-2',
        type: 'IssueUpdate',
        updatedAt: '2026-01-02T10:00:00.000Z',
      },
    ]);
  });

  it('builds a burndown issue from a Yandex payload and status changelog', () => {
    const issue = buildIssueTrackerBurndownIssueFromPayloadAndLogs(
      yandexIssue,
      yandexChangelogLogs,
      { sprintId: '9001', sprintName: 'Sprint 12' },
      'BT-100'
    );

    expect(issue).toMatchObject({
      changelog: [{ date: '2026-01-02T10:00:00.000Z', isDone: true }],
      inCurrentSprint: true,
      issueKey: 'BT-100',
      statusKey: 'inProgress',
      storyPoints: 5,
      testPoints: 2,
    });
    expect(issue.rawChangelog).toHaveLength(2);
    expect(issue.rawChangelog[1]).toMatchObject({
      id: 'log-2',
      updatedAt: '2026-01-02T10:00:00.000Z',
    });
  });
});
