import { describe, expect, it } from 'vitest';

import { jiraCloudOAuthApiBaseUrl } from './jiraCloudApiUrl';

describe('jiraCloudOAuthApiBaseUrl', () => {
  it('builds api.atlassian.com ex/jira base', () => {
    expect(jiraCloudOAuthApiBaseUrl('cloud-123')).toBe(
      'https://api.atlassian.com/ex/jira/cloud-123/rest/api/3'
    );
  });

  it('rejects empty cloudId', () => {
    expect(() => jiraCloudOAuthApiBaseUrl('  ')).toThrow(/cloudId/i);
  });
});
