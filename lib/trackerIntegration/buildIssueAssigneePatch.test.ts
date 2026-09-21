import { describe, expect, it } from 'vitest';

import { buildIssueAssigneePatch } from './buildIssueAssigneePatch';

describe('buildIssueAssigneePatch', () => {
  it('defaults to domain assignee keys without a Tracker field name', () => {
    expect(buildIssueAssigneePatch('u1', false, null)).toEqual({
      assigneeId: 'u1',
      isQa: false,
    });
    expect(buildIssueAssigneePatch('u1', true, null)).toEqual({
      assigneeId: 'u1',
      isQa: true,
    });
  });

  it('passes custom testingFlow field ids through for the adapter', () => {
    const integration = {
      configRevision: 1,
      testingFlow: {
        devAssigneeFieldId: 'lead',
        qaEngineerFieldId: 'qaOwner',
      },
    };
    expect(buildIssueAssigneePatch('x', false, integration)).toEqual({
      assigneeField: 'lead',
      assigneeId: 'x',
      isQa: false,
    });
    expect(buildIssueAssigneePatch('x', true, integration)).toEqual({
      assigneeField: 'qaOwner',
      assigneeId: 'x',
      isQa: true,
    });
  });
});
