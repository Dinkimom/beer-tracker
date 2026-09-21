import { describe, expect, it } from 'vitest';

import { getTaskTrackerIssueUrl, getTrackerIssueUrlByKey } from './taskUtils';

const yandexTracker = {
  kind: 'tracker' as const,
  webBaseUrl: 'https://tracker.yandex.ru',
};

const jiraTracker = {
  kind: 'jira-onprem' as const,
  webBaseUrl: 'https://jira.example.com',
};

describe('taskUtils tracker web URLs', () => {
  it('rebuilds a Yandex issue URL from the current web base', () => {
    expect(
      getTaskTrackerIssueUrl(
        { id: 'BT-1', link: 'https://example.com/ignored', name: 'T', team: 'Web' },
        yandexTracker
      )
    ).toBe('https://tracker.yandex.ru/BT-1');
  });

  it('rebuilds a Jira browse URL instead of a stored Yandex link', () => {
    expect(
      getTaskTrackerIssueUrl(
        { id: 'PROJ-12', link: 'https://tracker.yandex.ru/PROJ-12', name: 'T', team: 'Web' },
        jiraTracker
      )
    ).toBe('https://jira.example.com/browse/PROJ-12');
  });

  it('builds a key URL from the current tracker web base', () => {
    expect(getTrackerIssueUrlByKey('BT-1', yandexTracker)).toBe('https://tracker.yandex.ru/BT-1');
    expect(getTrackerIssueUrlByKey('PROJ-12', jiraTracker)).toBe(
      'https://jira.example.com/browse/PROJ-12'
    );
  });
});
