import type { IssueTrackerProviderKind } from './types';

import { describe, expect, it } from 'vitest';

import { jiraTrackerProvider } from './jiraProvider';
import { isIssueTrackerProviderKind, resolveIssueTrackerProvider } from './registry';
import {
  mergeOrganizationSettingsIssueTrackerPatch,
  organizationIssueTrackerPublicDto,
  parseIssueTrackerSettings,
  readOrganizationIssueTrackerConfig,
  YANDEX_TRACKER_DEFAULT_API_URL,
} from './settings';

describe('issueTrackerProvider registry', () => {
  it('resolves Yandex Tracker as the default provider', () => {
    const provider = resolveIssueTrackerProvider();

    expect(provider.kind).toBe('yandex-tracker');
  });

  it('recognizes currently supported provider kinds', () => {
    expect(isIssueTrackerProviderKind('tracker')).toBe(true);
    expect(isIssueTrackerProviderKind('jira-cloud')).toBe(true);
    expect(isIssueTrackerProviderKind('jira-onprem')).toBe(true);
    expect(isIssueTrackerProviderKind('jira')).toBe(false);
    expect(isIssueTrackerProviderKind('linear')).toBe(false);
  });

  it('resolves both Jira flavors to the Jira adapter', () => {
    expect(resolveIssueTrackerProvider('jira-cloud')).toBe(jiraTrackerProvider);
    expect(resolveIssueTrackerProvider('jira-onprem')).toBe(jiraTrackerProvider);
    expect(resolveIssueTrackerProvider('jira-cloud').kind).toBe('jira');
  });

  it('rejects provider kinds without a registered adapter', () => {
    const invalid = 'unknown-provider' as IssueTrackerProviderKind;
    expect(() => resolveIssueTrackerProvider(invalid)).toThrow(
      /Unsupported issue tracker provider: unknown-provider/
    );
  });
});

describe('issueTrackerProvider settings', () => {
  it('treats an organization without a provider as not connected', () => {
    expect(readOrganizationIssueTrackerConfig({})).toBeNull();
    expect(readOrganizationIssueTrackerConfig(null)).toBeNull();
    expect(organizationIssueTrackerPublicDto({ issueTracker: {} })).toBeNull();
  });

  it('uses the public Yandex API when the tracker provider has no stored URL', () => {
    expect(readOrganizationIssueTrackerConfig({ issueTracker: { provider: 'tracker' } })).toEqual({
      apiUrl: YANDEX_TRACKER_DEFAULT_API_URL,
      kind: 'tracker',
    });
  });

  it('requires an explicit URL for Jira', () => {
    expect(readOrganizationIssueTrackerConfig({ issueTracker: { provider: 'jira-onprem' } })).toBeNull();
    expect(
      organizationIssueTrackerPublicDto({
        issueTracker: {
          apiUrl: 'https://acme.atlassian.net/rest/api/3',
          provider: 'jira-cloud',
        },
      })
    ).toEqual({
      apiUrl: 'https://acme.atlassian.net/rest/api/3',
      kind: 'jira-cloud',
      webBaseUrl: 'https://acme.atlassian.net',
    });
  });

  it('parses Jira Cloud as a provider setting', () => {
    expect(parseIssueTrackerSettings({ provider: 'jira-cloud' })).toEqual({
      provider: 'jira-cloud',
    });
  });

  it('coerces legacy yandex-tracker settings to tracker', () => {
    expect(parseIssueTrackerSettings({ provider: 'yandex-tracker' })).toEqual({
      provider: 'tracker',
    });
  });

  it('merges issue tracker settings without removing other settings keys', () => {
    const next = mergeOrganizationSettingsIssueTrackerPatch(
      { sync: { enabled: true }, trackerIntegration: { configRevision: 1 } },
      { provider: 'jira-onprem' }
    );

    expect(next).toEqual({
      issueTracker: { provider: 'jira-onprem' },
      sync: { enabled: true },
      trackerIntegration: { configRevision: 1 },
    });
  });

  it('rejects unknown provider settings', () => {
    expect(() => parseIssueTrackerSettings({ provider: 'linear' })).toThrow(
      /Invalid issue tracker settings/
    );
  });
});
