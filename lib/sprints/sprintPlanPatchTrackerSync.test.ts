import { describe, expect, it } from 'vitest';

import {
  buildIssueNotInSprintPlanPatchHints,
  collectIssueNotInSprintWarnings,
} from './sprintPlanPatchTrackerSync';

describe('collectIssueNotInSprintWarnings', () => {
  it('warns once per missing upsertPosition task', () => {
    expect(
      collectIssueNotInSprintWarnings(
        [
          {
            assigneeId: 'staff:a',
            duration: 1,
            op: 'upsertPosition',
            startDay: 0,
            startPart: 0,
            taskId: 'RND-1441',
          },
          {
            assigneeId: 'staff:a',
            duration: 1,
            op: 'upsertPosition',
            startDay: 1,
            startPart: 0,
            taskId: 'RND-1441',
          },
          {
            assigneeId: 'staff:a',
            duration: 1,
            op: 'upsertPosition',
            startDay: 0,
            startPart: 0,
            taskId: 'RND-1999',
          },
        ],
        new Set(['RND-1999'])
      )
    ).toEqual(['issue_not_in_sprint: RND-1441']);
  });
});

describe('buildIssueNotInSprintPlanPatchHints', () => {
  it('hints to re-propose with syncToTracker when missing from tracker sprint', () => {
    const ops = [
      {
        assigneeId: 'staff:a',
        duration: 2,
        op: 'upsertPosition' as const,
        segments: [
          { duration: 1, startDay: 0, startPart: 0 },
          { duration: 1, startDay: 1, startPart: 0 },
        ],
        startDay: 0,
        startPart: 0,
        taskId: 'RND-1915',
      },
    ];
    const hints = buildIssueNotInSprintPlanPatchHints(ops, [
      'issue_not_in_sprint: RND-1915',
    ]);
    expect(hints).toHaveLength(1);
    expect(hints[0]).toContain('syncToTracker:true');
    expect(hints[0]).toContain('segments');
    expect(hints[0]).toContain('RND-1915');
  });

  it('says a planner card still moves when the issue is missing from the tracker sprint', () => {
    const hint = buildIssueNotInSprintPlanPatchHints(
      [
        {
          assigneeId: 'staff:a',
          duration: 1,
          op: 'upsertPosition',
          startDay: 0,
          startPart: 0,
          taskId: 'RND-1779',
        },
      ],
      ['issue_not_in_sprint: RND-1779'],
      new Set(['RND-1779'])
    )[0];
    expect(hint).toContain('already on the planner');
    expect(hint).toContain('still applies without syncToTracker');
  });

  it('skips hint when syncToTracker is already set', () => {
    expect(
      buildIssueNotInSprintPlanPatchHints(
        [
          {
            assigneeId: 'staff:a',
            duration: 1,
            op: 'upsertPosition',
            startDay: 0,
            startPart: 0,
            syncToTracker: true,
            taskId: 'RND-1915',
          },
        ],
        ['issue_not_in_sprint: RND-1915']
      )
    ).toEqual([]);
  });
});
