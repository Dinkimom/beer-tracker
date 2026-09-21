import { describe, expect, it } from 'vitest';

import {
  buildJiraBoardScopeJql,
  buildJiraIssueSearchJql,
  buildJiraIssueSearchTextClause,
  buildJiraQueueScopeJql,
  buildJiraQueuesScopeJql,
  buildJiraUpdatedRangeJql,
  formatJiraJqlDateTimeUtc,
} from './jiraIssueSearchJql';

describe('buildJiraIssueSearchTextClause', () => {
  it('uses summary prefix only for plain text queries', () => {
    expect(buildJiraIssueSearchTextClause('тест')).toBe('summary ~ "тест*"');
    expect(buildJiraIssueSearchTextClause('редиз')).toBe('summary ~ "редиз*"');
  });

  it('adds exact key match for full issue keys', () => {
    expect(buildJiraIssueSearchTextClause('PROJ-1')).toBe(
      '(summary ~ "PROJ-1*" OR key = "PROJ-1")'
    );
  });

  it('adds key prefix match for partial issue keys', () => {
    expect(buildJiraIssueSearchTextClause('PROJ-')).toBe(
      '(summary ~ "PROJ-*" OR key ~ "PROJ-*")'
    );
  });
});

describe('buildJiraIssueSearchJql', () => {
  it('builds board-scoped summary prefix JQL without invalid key clause', () => {
    expect(buildJiraIssueSearchJql(15116, 'редиз')).toBe(
      'board = 15116 AND summary ~ "редиз*"'
    );
    expect(buildJiraIssueSearchJql(15116, 'PROJ-1')).toBe(
      'board = 15116 AND (summary ~ "PROJ-1*" OR key = "PROJ-1")'
    );
  });

  it('prefers project scope when project key is known', () => {
    expect(buildJiraIssueSearchJql(15116, 'тест', { projectKey: 'BOOK' })).toBe(
      'project = "BOOK" AND summary ~ "тест*"'
    );
    expect(
      buildJiraIssueSearchJql(15116, 'тест', { extraAnd: 'issuetype in (10000)', projectKey: 'BOOK' })
    ).toBe('project = "BOOK" AND issuetype in (10000) AND summary ~ "тест*"');
  });
});

describe('buildJiraBoardScopeJql', () => {
  it('uses project key when present', () => {
    expect(buildJiraBoardScopeJql(15116, 'BOOK')).toBe('project = "BOOK"');
    expect(buildJiraBoardScopeJql(15116)).toBe('board = 15116');
  });
});

describe('buildJiraUpdatedRangeJql', () => {
  it('formats a UTC updated window for JQL search', () => {
    expect(
      formatJiraJqlDateTimeUtc(new Date('2026-03-01T10:00:00.000Z'))
    ).toBe('2026-03-01 10:00');
    expect(
      buildJiraUpdatedRangeJql(
        new Date('2026-03-01T10:00:00.000Z'),
        new Date('2026-03-10T12:00:00.000Z')
      )
    ).toBe(
      'updated >= "2026-03-01 10:00" AND updated <= "2026-03-10 12:00" ORDER BY updated ASC'
    );
  });

  it('scopes the updated window to team queues', () => {
    expect(buildJiraQueueScopeJql(' ST ')).toBe('project = "ST"');
    expect(buildJiraQueuesScopeJql(['ST', 'BT', 'ST'])).toBe('project in ("ST", "BT")');
    expect(
      buildJiraUpdatedRangeJql(
        new Date('2026-03-01T10:00:00.000Z'),
        new Date('2026-03-10T12:00:00.000Z'),
        { queueKeys: ['ST', 'BT'] }
      )
    ).toBe(
      'project in ("ST", "BT") AND updated >= "2026-03-01 10:00" AND updated <= "2026-03-10 12:00" ORDER BY updated ASC'
    );
  });
});
