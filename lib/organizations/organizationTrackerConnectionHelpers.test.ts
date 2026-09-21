import { describe, expect, it } from 'vitest';

import { resolveTrackerConnectionEmail } from './organizationTrackerConnectionHelpers';

describe('resolveTrackerConnectionEmail', () => {
  it('uses the request email when verifying a new token', () => {
    expect(
      resolveTrackerConnectionEmail({
        jiraEmail: 'ada@example.com',
        oauthToken: 'new-token',
        settingsRoot: {
          issueTracker: { basicAuthEmail: 'org@example.com', provider: 'jira-cloud' },
        },
      })
    ).toBe('ada@example.com');
  });

  it('uses the stored org email when checking the saved token', () => {
    expect(
      resolveTrackerConnectionEmail({
        jiraEmail: 'ada@example.com',
        settingsRoot: {
          issueTracker: { basicAuthEmail: 'org@example.com', provider: 'jira-cloud' },
        },
      })
    ).toBe('org@example.com');
  });

  it('falls back to the request email when the org has no stored Cloud email', () => {
    expect(
      resolveTrackerConnectionEmail({
        jiraEmail: 'ada@example.com',
        settingsRoot: {},
      })
    ).toBe('ada@example.com');
  });
});
