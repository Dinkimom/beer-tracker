import type { SprintIssueFact, SprintMetricsRecord } from './sprintMetricsTypes';

import { describe, expect, it } from 'vitest';

import { summarizeSprintFacts } from './aggregateSprintMetrics';
import {
  buildQuarterRows,
  buildSprintMetricsCsv,
  buildSprintRows,
  kpiTrend,
  kpiValue,
  pickQuarterComparison,
  workMixPercents,
} from './sprintMetricsView';

function fact(overrides: Partial<SprintIssueFact> = {}): SprintIssueFact {
  return {
    added: false,
    carriedOver: false,
    category: 'feature',
    codingDays: 0,
    committed: true,
    cycleDays: null,
    declined: false,
    done: true,
    dwell: {},
    key: 'CM-1',
    removed: false,
    spEnd: 4,
    spStart: 4,
    team: 'Checkout',
    tpEnd: 0,
    waitingDays: 0,
    ...overrides,
  };
}

function record(sprintId: number, startDate: string, facts: SprintIssueFact[], open = false): SprintMetricsRecord {
  return {
    computedAt: '',
    endDate: '',
    facts,
    frozen: !open,
    goals: { done: 0, total: 0 },
    name: `Sprint ${sprintId}`,
    open,
    sprintId,
    startDate,
  };
}

const records = [
  record(1, '2026-04-06T06:00:00.000Z', [fact({ spEnd: 4 }), fact({ category: 'bug', key: 'B', spEnd: 4 })]),
  record(2, '2026-07-06T06:00:00.000Z', [fact({ spEnd: 10 })]),
  record(3, '2026-10-05T06:00:00.000Z', [fact({ spEnd: 2 })], true),
];

describe('quarter rows and comparison', () => {
  it('compares the latest quarter with closed sprints to the one before', () => {
    const quarters = buildQuarterRows(records, null);
    expect(quarters.map((row) => row.quarter)).toEqual(['2026-Q2', '2026-Q3', '2026-Q4']);
    expect(quarters[2]?.summary).toBeNull();
    expect(quarters[2]?.hasOpenSprint).toBe(true);

    const { current, previous } = pickQuarterComparison(quarters);
    expect(current?.quarter).toBe('2026-Q3');
    expect(previous?.quarter).toBe('2026-Q2');
    expect(kpiValue(current?.summary ?? null, 'velocity')).toBe(10);
    expect(kpiValue(previous?.summary ?? null, 'bugShare')).toBe(50);
  });

  it('builds sprint rows per team', () => {
    const rows = buildSprintRows(records, 'Nobody');
    expect(rows).toHaveLength(3);
    expect(rows[0]?.summary.done.count).toBe(0);
  });
});

describe('kpiTrend', () => {
  it('knows that lower is better for cycle time and carry-over', () => {
    expect(kpiTrend('velocity', 12, 10)?.trend).toBe('better');
    expect(kpiTrend('cycleTime', 4, 5)?.trend).toBe('better');
    expect(kpiTrend('carryOver', 30, 20)?.trend).toBe('worse');
    expect(kpiTrend('sayDo', 81, 80)?.trend).toBe('same');
    expect(kpiTrend('sayDo', 83, 80)?.trend).toBe('better');
    expect(kpiTrend('velocity', 40.3, 40.8)?.trend).toBe('same');
    expect(kpiTrend('sayDo', null, 80)).toBeNull();
  });
});

describe('workMixPercents', () => {
  it('splits closed points by category', () => {
    const summary = summarizeSprintFacts({
      facts: [fact({ spEnd: 3 }), fact({ category: 'tech', key: 'T', spEnd: 1 })],
      goals: { done: 0, total: 0 },
      open: false,
    });
    expect(workMixPercents(summary)).toEqual({ bug: 0, feature: 75, other: 0, tech: 25 });
  });

  it('keeps the shares summing to exactly 100', () => {
    const summary = summarizeSprintFacts({
      facts: [fact({ spEnd: 1 }), fact({ category: 'bug', key: 'B', spEnd: 1 }), fact({ category: 'tech', key: 'T', spEnd: 1 })],
      goals: { done: 0, total: 0 },
      open: false,
    });
    const mix = workMixPercents(summary);
    expect(mix.feature + mix.bug + mix.tech + mix.other).toBe(100);
  });
});

describe('buildSprintMetricsCsv', () => {
  it('writes one row per sprint and escapes names', () => {
    const rows = buildSprintRows([record(1, '2026-04-06T06:00:00.000Z', [fact()])], null);
    const named = [{ ...rows[0]!, name: 'Sprint "A", checkout' }];
    const csv = buildSprintMetricsCsv(named, {
      bugShare: 'Bugs',
      carryOver: 'Carry',
      cycleP50: 'p50',
      cycleP85: 'p85',
      doneSp: 'SP',
      flowEfficiency: 'Flow',
      goals: 'Goals',
      quarter: 'Quarter',
      sayDo: 'SayDo',
      scopeChange: 'Added',
      sprint: 'Sprint',
      throughput: 'Tasks',
    });
    const [header, line] = csv.split('\n');
    expect(header).toBe('Quarter,Sprint,SP,Tasks,SayDo,Added,Carry,p50,p85,Flow,Goals,Bugs');
    expect(line).toBe('2026-Q2,"Sprint ""A"", checkout",4,1,100,0,0,,,,,0');
  });
});
