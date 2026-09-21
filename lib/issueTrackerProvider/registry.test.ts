import type { IssueTrackerProviderKind } from './types';

import { describe, expect, it } from 'vitest';

import { jiraTrackerProvider } from './jiraProvider';
import { isIssueTrackerProviderKind, resolveIssueTrackerProvider } from './registry';
import {
  mergeOrganizationSettingsIssueTrackerPatch,
  parseIssueTrackerSettings,
  resolveIssueTrackerProviderKindFromSettingsRoot,
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
  it('defaults missing settings to tracker', () => {
    expect(resolveIssueTrackerProviderKindFromSettingsRoot({})).toBe('tracker');
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
