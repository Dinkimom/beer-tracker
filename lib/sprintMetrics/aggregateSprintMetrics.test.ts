import type { SprintIssueFact, SprintMetricsRecord } from './sprintMetricsTypes';

import { describe, expect, it } from 'vitest';

import {
  bottleneckStage,
  groupRecordsByQuarter,
  listFactTeams,
  summarizePeriod,
  summarizeSprintFacts,
} from './aggregateSprintMetrics';

function fact(overrides: Partial<SprintIssueFact> = {}): SprintIssueFact {
  return {
    added: false,
    carriedOver: false,
    category: 'feature',
    codingDays: 0,
    committed: true,
    cycleDays: null,
    declined: false,
    done: false,
    dwell: {},
    key: 'CM-1',
    removed: false,
    spEnd: 3,
    spStart: 3,
    team: 'Checkout',
    tpEnd: 1,
    waitingDays: 0,
    ...overrides,
  };
}

function record(overrides: Partial<SprintMetricsRecord> = {}): SprintMetricsRecord {
  return {
    computedAt: '2025-07-01T00:00:00.000Z',
    endDate: '2025-06-13T18:00:00.000Z',
    facts: [],
    frozen: true,
    goals: { done: 0, total: 0 },
    name: 'Sprint 7',
    open: false,
    sprintId: 7,
    startDate: '2025-06-02T06:00:00.000Z',
    ...overrides,
  };
}

const NO_GOALS = { done: 0, total: 0 };

describe('summarizeSprintFacts', () => {
  const facts = [
    fact({ codingDays: 2, cycleDays: 4, done: true, dwell: { review: 1 }, key: 'A', spStart: 5, spEnd: 5, waitingDays: 2 }),
    fact({ carriedOver: true, key: 'B', spStart: 3 }),
    fact({ added: true, category: 'bug', codingDays: 1, committed: false, cycleDays: 2, done: true, dwell: { review: 3 }, key: 'C', spEnd: 2, waitingDays: 1 }),
    fact({ key: 'D', removed: true, spStart: 2 }),
  ];
  const summary = summarizeSprintFacts({ facts, goals: { done: 1, total: 2 }, open: false });

  it('computes say/do over committed story points', () => {
    expect(summary.committed).toEqual({ count: 3, sp: 10 });
    expect(summary.committedDone).toEqual({ count: 1, sp: 5 });
    expect(summary.sayDoPercent).toBe(50);
  });

  it('computes scope change, carry-over and goals', () => {
    expect(summary.scopeChangePercent).toBe(33);
    expect(summary.carryOver).toEqual({ count: 1, sp: 3 });
    expect(summary.carryOverPercent).toBe(25);
    expect(summary.removed.count).toBe(1);
    expect(summary.goalsPercent).toBe(50);
  });

  it('computes velocity, flow and work mix from done tasks', () => {
    expect(summary.done).toEqual({ count: 2, sp: 7, tp: 2 });
    expect(summary.cycleTime).toEqual({ p50Days: 3, p85Days: expect.closeTo(3.7, 5), sampleSize: 2 });
    expect(summary.flowEfficiencyPercent).toBe(50);
    expect(summary.waitingByStage.review).toBe(2);
    expect(summary.mix.bug).toEqual({ count: 1, sp: 2 });
    expect(summary.mix.feature).toEqual({ count: 1, sp: 5 });
  });

  it('falls back to task counts when nobody estimates', () => {
    const unestimated = summarizeSprintFacts({
      facts: [fact({ done: true, spStart: 0 }), fact({ key: 'B', spStart: 0 })],
      goals: NO_GOALS,
      open: false,
    });
    expect(unestimated.sayDoPercent).toBe(50);
  });

  it('hides carry-over for an open sprint', () => {
    const open = summarizeSprintFacts({ facts, goals: NO_GOALS, open: true });
    expect(open.carryOver).toBeNull();
    expect(open.carryOverPercent).toBeNull();
  });
});

describe('summarizePeriod', () => {
  it('pools closed sprints and averages velocity per sprint', () => {
    const period = summarizePeriod(
      [
        record({ facts: [fact({ done: true, spEnd: 4 })], goals: { done: 1, total: 1 } }),
        record({ facts: [fact({ done: true, spEnd: 6 }), fact({ key: 'B' })], sprintId: 8 }),
        record({ facts: [fact({ done: true, spEnd: 100 })], open: true, sprintId: 9 }),
      ],
      null
    );
    expect(period?.sprintCount).toBe(2);
    expect(period?.velocityPerSprint).toBe(5);
    expect(period?.throughputPerSprint).toBe(1);
    expect(period?.goalsPercent).toBe(100);
  });

  it('filters by team', () => {
    const period = summarizePeriod(
      [record({ facts: [fact({ done: true, spEnd: 4 }), fact({ done: true, spEnd: 6, team: 'Search' })] })],
      'Search'
    );
    expect(period?.done.sp).toBe(6);
  });

  it('returns null without closed sprints', () => {
    expect(summarizePeriod([record({ open: true })], null)).toBeNull();
  });
});

describe('grouping helpers', () => {
  it('groups by quarter of sprint start', () => {
    const groups = groupRecordsByQuarter([
      record({ sprintId: 2, startDate: '2025-07-01T06:00:00.000Z' }),
      record({ sprintId: 1, startDate: '2025-03-20T06:00:00.000Z' }),
    ]);
    expect(groups.map((group) => group.quarter)).toEqual(['2025-Q1', '2025-Q3']);
  });

  it('lists teams and picks the bottleneck', () => {
    expect(listFactTeams([record({ facts: [fact({ team: 'B' }), fact({ team: 'A' }), fact({ team: null })] })])).toEqual(['A', 'B']);
    expect(bottleneckStage({ review: 1, testing: 2.5 })).toBe('testing');
    expect(bottleneckStage({})).toBeNull();
  });
});
