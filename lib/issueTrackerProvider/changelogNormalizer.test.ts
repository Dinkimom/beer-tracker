import { describe, expect, it } from 'vitest';

import {
  buildIssueTrackerBurndownIssueFromPayloadAndLogs,
  changelogEntriesFromRawIssueLogs,
} from './changelogNormalizer';

describe('changelogNormalizer', () => {
  it('normalizes raw issue logs into UI changelog entries', () => {
    const entries = changelogEntriesFromRawIssueLogs([
      {
        fields: [
          {
            field: { display: 'Status', id: 'status' },
            from: { display: 'Open', id: '1', key: 'open' },
            to: { display: 'In progress', id: '2', key: 'inProgress' },
          },
        ],
        id: 'log-1',
        updatedAt: '2026-01-01T10:00:00.000Z',
      },
    ]);

    expect(entries).toEqual([
      expect.objectContaining({
        id: 'log-1',
        updatedAt: '2026-01-01T10:00:00.000Z',
        fields: [
          expect.objectContaining({
            field: { display: 'Status', id: 'status' },
          }),
        ],
      }),
    ]);
  });

  it('builds burndown issue from issue payload and raw logs', () => {
    const issue = buildIssueTrackerBurndownIssueFromPayloadAndLogs(
      {
        key: 'BT-7',
        sprint: [{ display: 'Sprint 1', id: '10' }],
        status: { key: 'open' },
        storyPoints: 5,
        testPoints: 2,
      },
      [
        {
          fields: [
            {
              field: { display: 'Status', id: 'status' },
              from: { display: 'Open', id: '1', key: 'open' },
              to: { display: 'Closed', id: '2', key: 'closed' },
            },
          ],
          id: 'log-done',
          updatedAt: '2026-01-02T10:00:00.000Z',
        },
      ],
      { sprintId: '10', sprintName: 'Sprint 1' },
      'BT-7'
    );

    expect(issue).toMatchObject({
      issueKey: 'BT-7',
      storyPoints: 5,
      testPoints: 2,
      inCurrentSprint: true,
      changelog: [{ date: '2026-01-02T10:00:00.000Z', isDone: true }],
    });
    expect(issue.rawChangelog).toHaveLength(1);
  });
});
