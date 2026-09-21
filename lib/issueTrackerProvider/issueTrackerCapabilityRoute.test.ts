import { afterEach, describe, expect, it, vi } from 'vitest';

import { rejectUnsupportedIssueTrackerCapability } from './issueTrackerCapabilityRoute';

describe('rejectUnsupportedIssueTrackerCapability', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns 422 for unimplemented Jira catalog holes', async () => {
    vi.stubEnv('ISSUE_TRACKER_PROVIDER', 'jira-cloud');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = rejectUnsupportedIssueTrackerCapability('supportsFieldCatalog', 'getField');
    expect(res).not.toBeNull();
    expect(res?.status).toBe(422);
    expect(await res?.json()).toMatchObject({
      code: 'issue_tracker_unsupported_operation',
      operation: 'getField',
      provider: 'jira',
    });
  });

  it('lets Yandex-shaped capabilities through', () => {
    vi.stubEnv('ISSUE_TRACKER_PROVIDER', 'tracker');
    expect(rejectUnsupportedIssueTrackerCapability('supportsFieldCatalog', 'getField')).toBeNull();
  });
});
