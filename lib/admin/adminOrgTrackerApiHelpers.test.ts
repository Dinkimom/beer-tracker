import { NextResponse } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import { resolveAdminOrgIssueTracker } from './adminOrgTrackerApiHelpers';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

describe('resolveAdminOrgIssueTracker', () => {
  it('returns the organization tracker config', () => {
    expect(
      resolveAdminOrgIssueTracker({
        settings: { issueTracker: { apiUrl: 'https://jira.example.com/rest/api/2', provider: 'jira-onprem' } },
      })
    ).toEqual({ apiUrl: 'https://jira.example.com/rest/api/2', kind: 'jira-onprem' });
  });

  it('answers 422 when the tracker is not connected yet', async () => {
    const res = resolveAdminOrgIssueTracker({ settings: {} });
    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(422);
    await expect((res as NextResponse).json()).resolves.toHaveProperty('error');
  });
});
