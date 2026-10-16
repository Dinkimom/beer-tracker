import { describe, expect, it } from 'vitest';

import { collectIssueNotInSprintWarnings } from './sprintPlanPatchTrackerSync';

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
