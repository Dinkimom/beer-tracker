import { describe, expect, it } from 'vitest';

import { buildTrackerIssueFromProviderIssue } from './yandexTrackerIssueMappingHelpers';

describe('buildTrackerIssueFromProviderIssue', () => {
  it('preserves status.id for id-keyed integration overrides', () => {
    const issue = buildTrackerIssueFromProviderIssue({
      id: '10001',
      key: 'RND-1803',
      provider: 'jira',
      status: {
        display: 'Blocked',
        id: '10009',
        key: 'blocked',
      },
      statusType: { display: 'In Progress', key: 'inProgress' },
      summary: 'Test',
    });
    expect(issue.status).toEqual({
      display: 'Blocked',
      id: '10009',
      key: 'blocked',
    });
  });
});
