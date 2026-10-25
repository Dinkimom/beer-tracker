import type { YtrackerBurndownChangelogEntry, YtrackerBurndownIssue } from '@/lib/ytrackerRawIssues';
import type { TrackerIssue } from '@/types/tracker';

import { describe, expect, it } from 'vitest';

import { sprintTaskCompletionRulesFromStatuses } from '@/lib/sprints/sprintTaskCompletion';

import {
  buildSprintIssueFact,
  buildSprintIssueFacts,
  categorizeIssueType,
  statusKeyAt,
} from './sprintIssueFacts';

const SPRINT = { display: 'Sprint 7', id: '7' };
const NEXT_SPRINT = { display: 'Sprint 8', id: '8' };

// Пн 2 июня — пт 13 июня 2025, конец спринта — пятница 18:00 UTC.
const window = {
  completionRules: sprintTaskCompletionRulesFromStatuses('jira-cloud', [
    { id: 'closed', key: 'closed', statusType: { key: 'done' } },
  ]),
  endMs: Date.parse('2025-06-13T18:00:00.000Z'),
  nowMs: Date.parse('2025-07-01T00:00:00.000Z'),
  sprintId: '7',
  sprintName: 'Sprint 7',
  startMs: Date.parse('2025-06-02T06:00:00.000Z'),
};

function trackerIssue(overrides: Partial<TrackerIssue> = {}): TrackerIssue {
  return {
    createdAt: '2025-05-20T10:00:00.000Z',
    functionalTeam: 'Checkout',
    id: 'id-1',
    key: 'CM-1',
    self: '',
    status: { display: 'Closed', key: 'closed' },
    storyPoints: 5,
    summary: 'Task',
    type: { display: 'Task', key: 'task' },
    ...overrides,
  };
}

function sprintMove(at: string, from: unknown[], to: unknown[]): YtrackerBurndownChangelogEntry {
  return { fields: [{ field: { id: 'sprint' }, from, to }], updatedAt: at };
}

function statusMove(at: string, from: string, to: string): YtrackerBurndownChangelogEntry {
  return { fields: [{ field: { id: 'status' }, from: { key: from }, to: { key: to } }], updatedAt: at };
}

function burndownIssue(
  rawChangelog: YtrackerBurndownChangelogEntry[],
  overrides: Partial<YtrackerBurndownIssue> = {}
): YtrackerBurndownIssue {
  return {
    inCurrentSprint: true,
    issueKey: 'CM-1',
    rawChangelog,
    statusKey: 'closed',
    storyPoints: 5,
    testPoints: 2,
    ...overrides,
  };
}

const plannedIntoSprint = sprintMove('2025-05-30T12:00:00.000Z', [], [SPRINT]);
const OPEN_ISSUE: Partial<TrackerIssue> = { status: { display: 'Open', key: 'open' } };

describe('buildSprintIssueFact', () => {
  it('counts a task planned before start and closed in sprint as committed and done', () => {
    const fact = buildSprintIssueFact(
      trackerIssue(),
      burndownIssue([
        plannedIntoSprint,
        statusMove('2025-06-03T08:00:00.000Z', 'open', 'inProgress'),
        statusMove('2025-06-05T08:00:00.000Z', 'inProgress', 'closed'),
      ]),
      window
    );
    expect(fact).toMatchObject({
      added: false,
      carriedOver: false,
      committed: true,
      done: true,
      spStart: 5,
      tpEnd: 2,
    });
    expect(fact?.cycleDays).toBeCloseTo(2, 5);
  });

  it('treats a task added on day one as part of the plan', () => {
    const fact = buildSprintIssueFact(
      trackerIssue(OPEN_ISSUE),
      burndownIssue([sprintMove('2025-06-02T10:00:00.000Z', [], [SPRINT])], { statusKey: 'open' }),
      window
    );
    expect(fact?.committed).toBe(true);
  });

  it('marks a task added mid-sprint as added, not committed', () => {
    const fact = buildSprintIssueFact(
      trackerIssue(OPEN_ISSUE),
      burndownIssue([sprintMove('2025-06-06T10:00:00.000Z', [], [SPRINT])], { statusKey: 'open' }),
      window
    );
    expect(fact).toMatchObject({ added: true, committed: false });
  });

  it('marks a task created mid-sprint without a sprint change as added', () => {
    const fact = buildSprintIssueFact(
      trackerIssue({ createdAt: '2025-06-09T10:00:00.000Z' }),
      burndownIssue([]),
      window
    );
    expect(fact).toMatchObject({ added: true, committed: false });
  });

  it('counts an unfinished task moved at sprint close as carry-over', () => {
    const fact = buildSprintIssueFact(
      trackerIssue({ status: { display: 'In progress', key: 'inProgress' } }),
      burndownIssue(
        [plannedIntoSprint, sprintMove('2025-06-13T17:00:00.000Z', [SPRINT], [NEXT_SPRINT])],
        { statusKey: 'inProgress' }
      ),
      window
    );
    expect(fact).toMatchObject({ carriedOver: true, done: false, removed: false });
  });

  it('counts a task taken out in the middle of the sprint as removed', () => {
    const fact = buildSprintIssueFact(
      trackerIssue({ status: { display: 'Open', key: 'open' } }),
      burndownIssue([plannedIntoSprint, sprintMove('2025-06-04T10:00:00.000Z', [SPRINT], [])], {
        statusKey: 'open',
      }),
      window
    );
    expect(fact).toMatchObject({ carriedOver: false, committed: true, removed: true });
  });

  it('does not report carry-over while the sprint is still open', () => {
    const fact = buildSprintIssueFact(
      trackerIssue({ status: { display: 'Open', key: 'open' } }),
      burndownIssue([plannedIntoSprint], { statusKey: 'open' }),
      { ...window, nowMs: Date.parse('2025-06-10T10:00:00.000Z') }
    );
    expect(fact).toMatchObject({ carriedOver: false, committed: true, done: false });
  });

  it('does not count a declined task as done', () => {
    const fact = buildSprintIssueFact(
      trackerIssue({ status: { display: "Won't do", key: 'wontDo' } }),
      burndownIssue(
        [plannedIntoSprint, statusMove('2025-06-04T10:00:00.000Z', 'open', 'wontDo')],
        { statusKey: 'wontDo' }
      ),
      window
    );
    expect(fact).toMatchObject({ carriedOver: false, declined: true, done: false });
  });

  it('counts a custom status mapped to done by organization rules as delivered', () => {
    const shipped = { display: 'Shipped', key: 'shipped' };
    const yt = burndownIssue(
      [plannedIntoSprint, statusMove('2025-06-05T08:00:00.000Z', 'inProgress', 'shipped')],
      { statusKey: 'shipped' }
    );
    const completionRules = sprintTaskCompletionRulesFromStatuses('jira-cloud', [{ id: 'shipped', key: 'shipped', statusType: { key: 'done' } }]);
    expect(buildSprintIssueFact(trackerIssue({ status: shipped }), yt, window)?.done).toBe(false);
    expect(
      buildSprintIssueFact(trackerIssue({ status: shipped }), yt, { ...window, completionRules })?.done
    ).toBe(true);
  });

  it('does not count the ready-for-release status as delivered (SP not done)', () => {
    const rc = { display: 'RC', key: 'rc' };
    const fact = buildSprintIssueFact(
      trackerIssue({ status: rc }),
      burndownIssue([plannedIntoSprint, statusMove('2025-06-05T08:00:00.000Z', 'inProgress', 'rc')], {
        statusKey: 'rc',
      }),
      { ...window, completionRules: sprintTaskCompletionRulesFromStatuses('jira-cloud', []) }
    );
    expect(fact).toMatchObject({ committed: true, done: false });
  });

  it('keeps declined out of delivery even if organization rules map it to done', () => {
    const fact = buildSprintIssueFact(
      trackerIssue({ status: { display: 'Cancelled', key: 'cancelled' } }),
      burndownIssue(
        [plannedIntoSprint, statusMove('2025-06-04T10:00:00.000Z', 'open', 'cancelled')],
        { statusKey: 'cancelled' }
      ),
      {
        ...window,
        completionRules: sprintTaskCompletionRulesFromStatuses('jira-cloud', [{ id: 'cancelled', key: 'cancelled', statusType: { key: 'done' } }]),
      }
    );
    expect(fact).toMatchObject({ declined: true, done: false });
  });

  it('skips a task that left the sprint before it started', () => {
    const fact = buildSprintIssueFact(
      trackerIssue(),
      burndownIssue([plannedIntoSprint, sprintMove('2025-05-31T10:00:00.000Z', [SPRINT], [])]),
      window
    );
    expect(fact).toBeNull();
  });
});

describe('buildSprintIssueFacts', () => {
  it('drops epics and issues without changelog', () => {
    const facts = buildSprintIssueFacts(
      [
        trackerIssue(OPEN_ISSUE),
        trackerIssue({ ...OPEN_ISSUE, key: 'CM-2', type: { display: 'Epic', key: 'epic' } }),
        trackerIssue({ ...OPEN_ISSUE, key: 'CM-3' }),
      ],
      [
        burndownIssue([plannedIntoSprint], { statusKey: 'open' }),
        burndownIssue([plannedIntoSprint], { issueKey: 'CM-2', statusKey: 'open' }),
      ],
      window
    );
    expect(facts.map((fact) => fact.key)).toEqual(['CM-1']);
  });
});

describe('statusKeyAt', () => {
  const history = [
    statusMove('2025-06-03T08:00:00.000Z', 'open', 'inProgress'),
    statusMove('2025-06-05T08:00:00.000Z', 'inProgress', 'closed'),
  ];

  it('reads the status at a moment from transitions', () => {
    expect(statusKeyAt(history, Date.parse('2025-06-01T00:00:00.000Z'), 'closed')).toBe('open');
    expect(statusKeyAt(history, Date.parse('2025-06-04T00:00:00.000Z'), 'closed')).toBe('inProgress');
    expect(statusKeyAt(history, Date.parse('2025-06-06T00:00:00.000Z'), 'closed')).toBe('closed');
    expect(statusKeyAt([], Date.parse('2025-06-01T00:00:00.000Z'), 'closed')).toBe('closed');
  });
});

describe('categorizeIssueType', () => {
  it('maps tracker types to work categories', () => {
    expect(categorizeIssueType('bug')).toBe('bug');
    expect(categorizeIssueType('Tech Debt')).toBe('tech');
    expect(categorizeIssueType('story')).toBe('feature');
    expect(categorizeIssueType('milestone')).toBe('other');
    expect(categorizeIssueType(undefined)).toBe('other');
  });
});
