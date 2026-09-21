import { describe, expect, it } from 'vitest';

import {
  aggregateSprintScorePoints,
  isDoneForSprintScore,
} from './sprintScoreAggregate';

describe('isDoneForSprintScore', () => {
  it('treats closed as done', () => {
    expect(
      isDoneForSprintScore({
        id: '1',
        key: 'X-1',
        self: 'u',
        summary: 's',
        status: { display: 'Closed', key: 'closed' },
      })
    ).toBe(true);
  });

  it('treats open as not done', () => {
    expect(
      isDoneForSprintScore({
        id: '1',
        key: 'X-1',
        self: 'u',
        summary: 's',
        status: { display: 'Open', key: 'open' },
      })
    ).toBe(false);
  });
});

describe('aggregateSprintScorePoints', () => {
  it('splits dev vs QA and done vs left', () => {
    const issues = [
      {
        id: '1',
        key: 'A',
        self: 'u',
        summary: 's',
        functionalTeam: 'Backend',
        status: { key: 'closed', display: 'c' },
        storyPoints: 5,
        testPoints: 0,
      },
      {
        id: '2',
        key: 'B',
        self: 'u',
        summary: 's',
        functionalTeam: 'Backend',
        status: { key: 'open', display: 'o' },
        storyPoints: 3,
        testPoints: 0,
      },
      {
        id: '3',
        key: 'C',
        self: 'u',
        summary: 's',
        functionalTeam: 'QA Team',
        status: { key: 'closed', display: 'c' },
        storyPoints: 1,
        testPoints: 4,
      },
      {
        id: '4',
        key: 'D',
        self: 'u',
        summary: 's',
        functionalTeam: 'tester',
        status: { key: 'open', display: 'o' },
        storyPoints: 0,
        testPoints: 2,
      },
    ];
    expect(aggregateSprintScorePoints(issues)).toEqual({
      sp_done: 5,
      sp_left: 3,
      qa_done: 4,
      qa_left: 2,
    });
  });
});
