import { describe, expect, it } from 'vitest';

import {
  jiraCloudOAuthApiBaseUrl,
  jiraCloudSiteHost,
  jiraCloudSiteRestApiUrl,
} from './jiraCloudApiUrl';

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

describe('jiraCloudSiteRestApiUrl', () => {
  it('builds the site REST root from the Atlassian site address', () => {
    expect(jiraCloudSiteRestApiUrl('https://acme.atlassian.net/')).toBe(
      'https://acme.atlassian.net/rest/api/3'
    );
  });

  it('returns empty string for a missing or invalid address', () => {
    expect(jiraCloudSiteRestApiUrl('')).toBe('');
    expect(jiraCloudSiteRestApiUrl('not a url')).toBe('');
  });
});

describe('jiraCloudSiteHost', () => {
  it('shows the site host for a site or REST URL', () => {
    expect(jiraCloudSiteHost('https://acme.atlassian.net')).toBe('acme.atlassian.net');
    expect(jiraCloudSiteHost('https://acme.atlassian.net/rest/api/3')).toBe('acme.atlassian.net');
  });

  it('keeps a non-URL value as is', () => {
    expect(jiraCloudSiteHost(' acme ')).toBe('acme');
  });
});
