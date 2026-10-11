import { afterEach, describe, expect, it, vi } from 'vitest';

import { rejectUnsupportedIssueTrackerCapability } from './issueTrackerCapabilityRoute';

describe('rejectUnsupportedIssueTrackerCapability', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 422 for unimplemented Jira catalog holes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = rejectUnsupportedIssueTrackerCapability(
      'jira-cloud',
      'supportsFieldCatalog',
      'getField'
    );
    expect(res).not.toBeNull();
    expect(res?.status).toBe(422);
    expect(await res?.json()).toMatchObject({
      code: 'issue_tracker_unsupported_operation',
      operation: 'getField',
      provider: 'jira',
    });
  });

  it('lets Yandex-shaped capabilities through', () => {
    expect(
      rejectUnsupportedIssueTrackerCapability('tracker', 'supportsFieldCatalog', 'getField')
    ).toBeNull();
  });
});
