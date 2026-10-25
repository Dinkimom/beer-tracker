import { describe, expect, it } from 'vitest';

import { YANDEX_TRACKER_TOKEN_HELP_PATH } from '@/lib/yandexOAuth/constants';

import {
  isHttpUrlOnTrackerWebBase,
  issueTrackerIssueWebUrl,
  issueTrackerIssueWebUrlFromBase,
  issueTrackerProviderCapabilities,
  issueTrackerProviderMessageKey,
  issueTrackerQueueWebUrlFromBase,
  issueTrackerRequiresExternalOrgId,
  issueTrackerShowsSettingsTokenTab,
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
      supportsIssueLinks: true,
      supportsQueryLanguageSearch: false,
      supportsRelatedIssues: false,
      supportsScreenCatalog: false,
    });
    expect(issueTrackerProviderCapabilities('tracker')).toEqual({
      supportsChecklists: true,
      supportsFieldCatalog: true,
      supportsIssueChildren: true,
      supportsIssueLinks: true,
      supportsQueryLanguageSearch: true,
      supportsRelatedIssues: true,
      supportsScreenCatalog: true,
    });
  });

  it('appends provider kind to an i18n base key', () => {
    expect(issueTrackerProviderMessageKey('admin.trackerSection.title', 'jira-cloud')).toBe(
      'admin.trackerSection.title.jira'
    );
    expect(issueTrackerProviderMessageKey('admin.trackerSection.title', 'tracker')).toBe(
      'admin.trackerSection.title.yandex-tracker'
    );
    expect(
      issueTrackerProviderMessageKey('productAuth.register.onboardingTagline', 'jira-cloud')
    ).toBe('productAuth.register.onboardingTagline.jira-cloud');
  });

  it('translates via the provider-suffixed i18n key', () => {
    const t = (key: string) => key;
    expect(translateIssueTrackerProviderMessage(t, 'jira-cloud', 'admin.trackerSection.title')).toBe(
      'admin.trackerSection.title.jira'
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

  it('hides settings token-paste tab for Jira Cloud OAuth', () => {
    expect(issueTrackerShowsSettingsTokenTab('jira-cloud')).toBe(false);
    expect(issueTrackerShowsSettingsTokenTab('jira-onprem')).toBe(true);
    expect(issueTrackerShowsSettingsTokenTab('tracker')).toBe(true);
  });

  it('points Jira token help at the site profile page from the API URL', () => {
    expect(jiraSiteOriginFromTrackerApiUrl('https://jira.example.com/rest/api/2')).toBe(
      'https://jira.example.com'
    );
    expect(issueTrackerTokenHelpUrl('jira-onprem', 'https://jira.example.com/rest/api/2')).toBe(
      'https://jira.example.com/secure/ViewProfile.jspa'
    );
    expect(issueTrackerTokenHelpUrl('jira-cloud', 'https://example.atlassian.net/rest/api/3')).toBe(
      'https://id.atlassian.com/manage-profile/security/api-tokens'
    );
    expect(
      issueTrackerTokenHelpUrl('jira-onprem', 'https://jira.example.com/jira/rest/api/2')
    ).toBe('https://jira.example.com/jira/secure/ViewProfile.jspa');
    expect(issueTrackerTokenHelpUrl('jira-onprem')).toBe('');
    expect(issueTrackerTokenHelpUrl('tracker')).toBe(YANDEX_TRACKER_TOKEN_HELP_PATH);
  });

  it('derives the issue web base from the API URL instead of hardcoding Yandex', () => {
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
      jiraSiteBaseFromTrackerApiUrl('https://api.atlassian.com/ex/jira/cloud-1/rest/api/3')
    ).toBeNull();
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
