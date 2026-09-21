import { describe, expect, it } from 'vitest';

import {
  cleanJiraBasicAuthEmail,
  isJiraCloudHost,
  jiraCloudRequiresBasicAuthEmail,
  jiraEmailFromRequest,
  resolveJiraBasicAuthEmail,
  TRACKER_EMAIL_HEADER,
} from './jiraBasicAuthEmail';

describe('isJiraCloudHost', () => {
  it('detects Atlassian Cloud sites', () => {
    expect(isJiraCloudHost('https://example.atlassian.net/rest/api/3')).toBe(true);
    expect(isJiraCloudHost('https://example.atlassian.net')).toBe(true);
    expect(isJiraCloudHost('example.atlassian.net')).toBe(true);
  });

  it('rejects Data Center and empty values', () => {
    expect(isJiraCloudHost('https://jira.example.com/rest/api/2')).toBe(false);
    expect(isJiraCloudHost('')).toBe(false);
    expect(isJiraCloudHost('not a url')).toBe(false);
  });
});

describe('jiraCloudRequiresBasicAuthEmail', () => {
  it('is required only for jira-cloud', () => {
    expect(jiraCloudRequiresBasicAuthEmail('jira-cloud')).toBe(true);
    expect(jiraCloudRequiresBasicAuthEmail('jira-onprem')).toBe(false);
    expect(jiraCloudRequiresBasicAuthEmail('tracker')).toBe(false);
  });
});

describe('resolveJiraBasicAuthEmail', () => {
  it('uses the request email for a personal token and ignores org', () => {
    expect(
      resolveJiraBasicAuthEmail({
        requestEmail: '  ada@example.com  ',
        storedOrgEmail: 'admin@example.com',
        usingRequestToken: true,
      })
    ).toBe('ada@example.com');
  });

  it('does not fall back to org email for a personal token', () => {
    expect(
      resolveJiraBasicAuthEmail({
        requestEmail: '',
        storedOrgEmail: 'admin@example.com',
        usingRequestToken: true,
      })
    ).toBe('');
  });

  it('uses stored org email for the org token', () => {
    expect(
      resolveJiraBasicAuthEmail({
        requestEmail: 'ada@example.com',
        storedOrgEmail: 'admin@example.com',
        usingRequestToken: false,
      })
    ).toBe('admin@example.com');
  });
});

describe('jiraEmailFromRequest', () => {
  it('reads the tracker email header', () => {
    const request = new Request('http://localhost/api/auth/myself', {
      headers: { [TRACKER_EMAIL_HEADER]: '  ada@example.com  ' },
    });
    expect(jiraEmailFromRequest(request)).toBe('ada@example.com');
    expect(cleanJiraBasicAuthEmail(undefined)).toBe('');
  });
});
