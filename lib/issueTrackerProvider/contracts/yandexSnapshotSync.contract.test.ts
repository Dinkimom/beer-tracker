import type { TrackerIssue } from '@/types/tracker';

import { describe, expect, it } from 'vitest';

import { issueDataSprintContains } from '@/lib/burndown/sprintMembership';
import { mapIssueToStoryResponse } from '@/lib/mappers';
import { issuePayloadMatchesBacklogFilters } from '@/lib/snapshots/backlogPayload';
import { trackerIssueFromSnapshotRow } from '@/lib/snapshots/issueSnapshotRowMapping';
import { storedIssueSnapshotForUpsert } from '@/lib/snapshots/issueSnapshotWrite';
import { statusKeyTypeKeySummaryFromPayload } from '@/lib/snapshots/snapshotPayloadSummary';
import {
  yandexBoardIssuesSearchQuery,
  yandexQueueIssuesSearchBody,
  yandexUpdatedAtSearchBody,
} from '@/lib/trackerApi/issues';

import { wrapIssueSnapshotForStorage } from '../snapshotEnvelope';

import yandexIssueFull from './fixtures/yandexIssueFull.json';

const yandexIssue = yandexIssueFull as TrackerIssue;
const envelope = wrapIssueSnapshotForStorage('yandex-tracker', yandexIssue);

describe('Yandex snapshot sync contract', () => {
  it('builds incremental POST /issues/_search body for updatedAt range', () => {
    expect(
      yandexUpdatedAtSearchBody(
        new Date('2026-03-01T10:00:00.000Z'),
        new Date('2026-03-10T12:00:00.000Z')
      )
    ).toEqual({
      filter: {
        updatedAt: {
          from: '2026-03-01T10:00:00.000+0000',
          to: '2026-03-10T12:00:00.000+0000',
        },
      },
      order: '+updatedAt',
    });
  });

  it('builds queue filter body for full sync', () => {
    expect(yandexQueueIssuesSearchBody('ST')).toEqual({ filter: { queue: 'ST' } });
    expect(
      yandexUpdatedAtSearchBody(
        new Date('2026-03-01T10:00:00.000Z'),
        new Date('2026-03-10T12:00:00.000Z'),
        { queueKeys: ['ST', 'BT'] }
      )
    ).toEqual({
      filter: {
        queue: ['ST', 'BT'],
        updatedAt: {
          from: '2026-03-01T10:00:00.000+0000',
          to: '2026-03-10T12:00:00.000+0000',
        },
      },
      order: '+updatedAt',
    });
  });

  it('builds board query language for board-scoped search', () => {
    expect(yandexBoardIssuesSearchQuery(7)).toBe('boards: 7');
    expect(yandexBoardIssuesSearchQuery(7, 'type: task')).toBe('boards: 7 AND (type: task)');
    expect(yandexBoardIssuesSearchQuery(7, '  ')).toBe('boards: 7');
  });

  it('upserts a schemaVersion-1 envelope around the Yandex issue', () => {
    expect(storedIssueSnapshotForUpsert(yandexIssue, 'yandex-tracker')).toEqual({
      issueKey: 'BT-100',
      storedPayload: envelope,
      trackerUpdatedAt: '2026-03-10T12:00:00.000+0000',
    });
  });

  it('treats snapshot envelope the same as a legacy Yandex payload for readers', () => {
    expect(issueDataSprintContains(envelope, 'Sprint 12', '9001')).toBe(true);
    expect(issueDataSprintContains(yandexIssue, 'Sprint 12', '9001')).toBe(true);
    expect(statusKeyTypeKeySummaryFromPayload(envelope)).toEqual(
      statusKeyTypeKeySummaryFromPayload(yandexIssue)
    );
    expect(mapIssueToStoryResponse(envelope)).toEqual(mapIssueToStoryResponse(yandexIssue));
    expect(issuePayloadMatchesBacklogFilters(envelope, { trackerQueueKey: 'BT' })).toBe(
      issuePayloadMatchesBacklogFilters(yandexIssue, { trackerQueueKey: 'BT' })
    );
  });

  it('keeps a no-sprint Yandex issue in the backlog whether stored flat or wrapped', () => {
    const backlogIssue = { ...yandexIssue, sprint: [] };
    const options = { trackerQueueKey: 'BT' };
    expect(issuePayloadMatchesBacklogFilters(backlogIssue, options)).toBe(true);
    expect(
      issuePayloadMatchesBacklogFilters(
        wrapIssueSnapshotForStorage('yandex-tracker', backlogIssue),
        options
      )
    ).toBe(true);
  });

  it('reads issue key from envelope payload in issue_snapshots rows', () => {
    const issue = trackerIssueFromSnapshotRow('legacy-row-id', envelope);
    expect(issue.key).toBe('BT-100');
    expect(issue.summary).toBe('Fix occupancy tooltip');
  });
});
