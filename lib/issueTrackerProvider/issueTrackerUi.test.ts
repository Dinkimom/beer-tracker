import { describe, expect, it } from 'vitest';

import { YANDEX_OAUTH_CLIENT_ID } from '@/constants';

import {
  JIRA_CLOUD_API_TOKEN_HELP_URL,
  isHttpUrlOnTrackerWebBase,
  issueTrackerIssueWebUrl,
  issueTrackerIssueWebUrlFromBase,
  issueTrackerProviderCapabilities,
  issueTrackerProviderMessageKey,
  issueTrackerQueueWebUrlFromBase,
  issueTrackerRequiresExternalOrgId,
  issueTrackerTokenHelpUrl,
  issueTrackerWebBaseFromApiUrl,
  jiraSiteBaseFromTrackerApiUrl,
  jiraSiteOriginFromTrackerApiUrl,
  resolveIssueTrackerExternalOrgIdForConnect,
  translateIssueTrackerProviderMessage,
} from './issueTrackerUi';

describe('issueTrackerUi', () => {
  it('treats Jira checklists and related issues as unsupported', () => {
    expect(issueTrackerProviderCapabilities('jira-cloud')).toEqual({
      supportsChecklists: false,
      supportsFieldCatalog: false,
      supportsIssueChildren: false,
      supportsQueryLanguageSearch: false,
      supportsRelatedIssues: false,
      supportsScreenCatalog: false,
      supportsSlaBugs: false,
    });
    expect(issueTrackerProviderCapabilities('tracker')).toEqual({
      supportsChecklists: true,
      supportsFieldCatalog: true,
      supportsIssueChildren: true,
      supportsQueryLanguageSearch: true,
      supportsRelatedIssues: true,
      supportsScreenCatalog: true,
      supportsSlaBugs: true,
    });
  });

  it('appends provider kind to an i18n base key', () => {
    expect(issueTrackerProviderMessageKey('admin.shell.nav.tracker', 'jira-cloud')).toBe(
      'admin.shell.nav.tracker.jira'
    );
    expect(issueTrackerProviderMessageKey('admin.shell.nav.tracker', 'tracker')).toBe(
      'admin.shell.nav.tracker.yandex-tracker'
    );
    expect(
      issueTrackerProviderMessageKey('productAuth.register.onboardingTagline', 'jira-cloud')
    ).toBe('productAuth.register.onboardingTagline.jira-cloud');
  });

  it('translates via the provider-suffixed i18n key', () => {
    const t = (key: string) => key;
    expect(translateIssueTrackerProviderMessage(t, 'jira-cloud', 'admin.shell.nav.tracker')).toBe(
      'admin.shell.nav.tracker.jira'
    );
  });

  it('does not require Cloud Org ID for Jira and fills a sentinel on connect', () => {
    expect(issueTrackerRequiresExternalOrgId('jira-cloud')).toBe(false);
    expect(issueTrackerRequiresExternalOrgId('jira-onprem')).toBe(false);
    expect(issueTrackerRequiresExternalOrgId('tracker')).toBe(true);
    expect(resolveIssueTrackerExternalOrgIdForConnect('jira-cloud', '  ')).toBe('jira');
    expect(resolveIssueTrackerExternalOrgIdForConnect('jira-onprem', 'site-1')).toBe('site-1');
    expect(resolveIssueTrackerExternalOrgIdForConnect('tracker', '')).toBe('');
  });

  it('points Jira token help at the site profile page from TRACKER_API_URL', () => {
    expect(jiraSiteOriginFromTrackerApiUrl('https://jira.example.com/rest/api/2')).toBe(
      'https://jira.example.com'
    );
    expect(issueTrackerTokenHelpUrl('jira-onprem', 'https://jira.example.com/rest/api/2')).toBe(
      'https://jira.example.com/secure/ViewProfile.jspa'
    );
    expect(issueTrackerTokenHelpUrl('jira-cloud', 'https://example.atlassian.net/rest/api/3')).toBe(
      JIRA_CLOUD_API_TOKEN_HELP_URL
    );
    expect(
      issueTrackerTokenHelpUrl('jira-onprem', 'https://jira.example.com/jira/rest/api/2')
    ).toBe('https://jira.example.com/jira/secure/ViewProfile.jspa');
    expect(issueTrackerTokenHelpUrl('jira-onprem')).toBe('');
    expect(issueTrackerTokenHelpUrl('tracker')).toContain('oauth.yandex.ru');
    expect(issueTrackerTokenHelpUrl('tracker')).toContain(YANDEX_OAUTH_CLIENT_ID);
  });

  it('derives the issue web base from TRACKER_API_URL instead of hardcoding Yandex', () => {
    expect(issueTrackerWebBaseFromApiUrl('tracker')).toBe('https://tracker.yandex.ru');
    expect(
      issueTrackerWebBaseFromApiUrl('tracker', 'https://api.tracker.yandex.net/v3')
    ).toBe('https://tracker.yandex.ru');
    expect(
      issueTrackerWebBaseFromApiUrl('tracker', 'https://st-api.yandex-team.ru/v2')
    ).toBe('https://st.yandex-team.ru');
    expect(jiraSiteBaseFromTrackerApiUrl('https://jira.example.com/rest/api/2')).toBe(
      'https://jira.example.com'
    );
    expect(jiraSiteBaseFromTrackerApiUrl('https://jira.example.com/jira/rest/api/2')).toBe(
      'https://jira.example.com/jira'
    );
    expect(
      issueTrackerWebBaseFromApiUrl('jira-onprem', 'https://jira.example.com/jira/rest/api/2')
    ).toBe('https://jira.example.com/jira');
  });

  it('builds provider-specific issue and queue web URLs', () => {
    expect(issueTrackerIssueWebUrl('tracker', 'BT-1')).toBe(
      'https://tracker.yandex.ru/BT-1'
    );
    expect(
      issueTrackerIssueWebUrl('jira-onprem', 'PROJ-12', 'https://jira.example.com/rest/api/2')
    ).toBe('https://jira.example.com/browse/PROJ-12');
    expect(
      issueTrackerIssueWebUrlFromBase('jira-cloud', 'https://jira.example.com/jira', 'PROJ-12')
    ).toBe('https://jira.example.com/jira/browse/PROJ-12');
    expect(
      issueTrackerQueueWebUrlFromBase('tracker', 'https://tracker.yandex.ru', 'DEV')
    ).toBe('https://tracker.yandex.ru/DEV');
    expect(
      issueTrackerQueueWebUrlFromBase('jira-cloud', 'https://jira.example.com', 'DEV')
    ).toBe('https://jira.example.com/projects/DEV');
  });

  it('treats only same-origin http(s) links as usable tracker web URLs', () => {
    expect(
      isHttpUrlOnTrackerWebBase(
        'https://tracker.yandex.ru/BT-1',
        'https://tracker.yandex.ru'
      )
    ).toBe(true);
    expect(
      isHttpUrlOnTrackerWebBase('https://tracker.yandex.ru/BT-1', 'https://jira.example.com')
    ).toBe(false);
    expect(isHttpUrlOnTrackerWebBase('BT-1', 'https://tracker.yandex.ru')).toBe(false);
  });
});
