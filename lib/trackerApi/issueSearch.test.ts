import { describe, expect, it } from 'vitest';

import { buildIssueSearchQueryOnBoard, buildSlaBugsQueryForProductTeam, toTrackerProductTeamValue } from './issues';

describe('buildIssueSearchQueryOnBoard', () => {
  it('scopes search to board with summary prefix and exact key', () => {
    expect(buildIssueSearchQueryOnBoard(42, 'айди')).toBe(
      'boards: 42 AND (Summary: "айди*" OR Key: "АЙДИ")'
    );
  });

  it('uppercases key match and keeps summary query as typed', () => {
    expect(buildIssueSearchQueryOnBoard(7, 'bt-w2-4c')).toBe(
      'boards: 7 AND (Summary: "bt-w2-4c*" OR Key: "BT-W2-4C")'
    );
  });

  it('escapes quotes in query text', () => {
    expect(buildIssueSearchQueryOnBoard(1, 'foo"bar')).toBe(
      'boards: 1 AND (Summary: "foo\\"bar*" OR Key: "FOO\\"BAR")'
    );
  });
});

describe('toTrackerProductTeamValue', () => {
  it('prefixes slug with team-', () => {
    expect(toTrackerProductTeamValue('booking')).toBe('team-booking');
  });

  it('does not double-prefix when slug already has team-', () => {
    expect(toTrackerProductTeamValue('team-booking')).toBe('team-booking');
  });
});

describe('buildSlaBugsQueryForProductTeam', () => {
  it('filters open bugs by product team field', () => {
    expect(buildSlaBugsQueryForProductTeam('booking')).toBe(
      '"Продуктовая команда": "team-booking" AND Type: bug AND Status: !closed'
    );
  });

  it('escapes quotes in team value', () => {
    expect(buildSlaBugsQueryForProductTeam('foo"bar')).toBe(
      '"Продуктовая команда": "team-foo\\"bar" AND Type: bug AND Status: !closed'
    );
  });
});
