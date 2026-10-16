import { describe, expect, it } from 'vitest';

import { resolveMcpIssueStatusCategory } from './resolveMcpIssueStatusCategory';

describe('resolveMcpIssueStatusCategory', () => {
  it('maps Ready for development to todo even when Jira category is inProgress', () => {
    expect(
      resolveMcpIssueStatusCategory({
        statusKey: 'readyfordevelopment',
        statusTypeKey: 'inProgress',
      })
    ).toBe('todo');
    expect(
      resolveMcpIssueStatusCategory({
        statusKey: 'Ready for development',
        statusTypeKey: 'inProgress',
      })
    ).toBe('todo');
  });

  it('falls back to tracker statusType when status name is unknown', () => {
    expect(
      resolveMcpIssueStatusCategory({
        statusKey: 'исследование',
        statusTypeKey: 'new',
      })
    ).toBe('todo');
    expect(
      resolveMcpIssueStatusCategory({
        statusKey: 'custom-wip',
        statusTypeKey: 'inProgress',
      })
    ).toBe('in-progress');
  });
});
