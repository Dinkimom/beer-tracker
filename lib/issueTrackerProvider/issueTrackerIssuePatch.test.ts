import { describe, expect, it } from 'vitest';

import { splitIssueTrackerIssuePatch, yandexIssueUpdateBody } from './issueTrackerIssuePatch';

describe('splitIssueTrackerIssuePatch', () => {
  it('peels domain assignee keys off the remaining REST fields', () => {
    expect(
      splitIssueTrackerIssuePatch({
        assigneeField: 'lead',
        assigneeId: 'u1',
        customFields: { customSp: 8 },
        isQa: false,
        summary: 'Fix',
      })
    ).toEqual({
      assigneeField: 'lead',
      assigneeId: 'u1',
      isQa: false,
      rest: { customSp: 8, summary: 'Fix' },
    });
  });
});

describe('yandexIssueUpdateBody', () => {
  it('maps assigneeId onto assignee or qaEngineer', () => {
    expect(yandexIssueUpdateBody({ assigneeId: 'u1', isQa: false })).toEqual({
      assignee: { id: 'u1' },
    });
    expect(yandexIssueUpdateBody({ assigneeId: 'u1', isQa: true })).toEqual({
      qaEngineer: { id: 'u1' },
    });
  });

  it('prefers a custom assigneeField from testingFlow', () => {
    expect(
      yandexIssueUpdateBody({ assigneeField: 'lead', assigneeId: 'x', isQa: false })
    ).toEqual({ lead: { id: 'x' } });
    expect(
      yandexIssueUpdateBody({ assigneeField: 'qaOwner', assigneeId: 'x', isQa: true })
    ).toEqual({ qaOwner: { id: 'x' } });
  });

  it('leaves native Tracker fields unchanged when there is no assigneeId', () => {
    expect(yandexIssueUpdateBody({ storyPoints: 5, tags: ['a'] })).toEqual({
      storyPoints: 5,
      tags: ['a'],
    });
  });
});
