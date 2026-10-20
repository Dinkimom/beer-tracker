/**
 * Модели отображения дашборда метрик: строки по спринтам и кварталам, сравнение кварталов, CSV.
 */

import type { SprintMetricsRecord, SprintMetricsSummary, SprintWorkCategory } from './sprintMetricsTypes';

import {
  filterFactsByTeam,
  groupRecordsByQuarter,
  summarizePeriod,
  summarizeSprintFacts,
  type SprintMetricsPeriodSummary,
} from './aggregateSprintMetrics';

export interface SprintMetricsSprintRow {
  id: number;
  name: string;
  open: boolean;
  quarter: string;
  startDate: string;
  summary: SprintMetricsSummary;
}

export interface SprintMetricsQuarterRow {
  hasOpenSprint: boolean;
  quarter: string;
  /** null — в квартале ещё нет закончившихся спринтов. */
  summary: SprintMetricsPeriodSummary | null;
}

export function buildSprintRows(
  records: SprintMetricsRecord[],
  team: string | null
): SprintMetricsSprintRow[] {
  return groupRecordsByQuarter(records).flatMap(({ quarter, records: list }) =>
    list.map((record) => ({
      id: record.sprintId,
      name: record.name,
      open: record.open,
      quarter,
      startDate: record.startDate,
      summary: summarizeSprintFacts({
        facts: filterFactsByTeam(record.facts, team),
        goals: record.goals,
        open: record.open,
      }),
    }))
  );
}

export function buildQuarterRows(
  records: SprintMetricsRecord[],
  team: string | null
): SprintMetricsQuarterRow[] {
  return groupRecordsByQuarter(records).map(({ quarter, records: list }) => ({
    hasOpenSprint: list.some((record) => record.open),
    quarter,
    summary: summarizePeriod(list, team),
  }));
}

/** Доли закрытой работы по категориям, % (по SP, без оценок — по штукам). */
const MIX_CATEGORIES: SprintWorkCategory[] = ['feature', 'bug', 'tech', 'other'];

export function workMixPercents(summary: SprintMetricsSummary): Record<SprintWorkCategory, number> {
  const bySp = summary.done.sp > 0;
  const total = bySp ? summary.done.sp : summary.done.count;
  const result: Record<SprintWorkCategory, number> = { bug: 0, feature: 0, other: 0, tech: 0 };
  if (total <= 0) return result;
  // Метод наибольших остатков: доли в сумме ровно 100.
  const exact = MIX_CATEGORIES.map((category) => {
    const part = bySp ? summary.mix[category].sp : summary.mix[category].count;
    return { category, value: (100 * part) / total };
  });
  for (const item of exact) result[item.category] = Math.floor(item.value);
  const missing = 100 - exact.reduce((sum, item) => sum + Math.floor(item.value), 0);
  const byRemainder = [...exact].sort((a, b) => (b.value % 1) - (a.value % 1));
  for (const item of byRemainder.slice(0, missing)) result[item.category] += 1;
  return result;
}

export function bugSharePercent(summary: SprintMetricsSummary): number | null {
  if (summary.done.count === 0) return null;
  return workMixPercents(summary).bug;
}

export type SprintMetricsKpiKey = 'bugShare' | 'carryOver' | 'cycleTime' | 'sayDo' | 'velocity';

export const SPRINT_METRICS_KPI_KEYS: SprintMetricsKpiKey[] = [
  'sayDo',
  'velocity',
  'cycleTime',
  'carryOver',
  'bugShare',
];

const HIGHER_IS_BETTER: Record<SprintMetricsKpiKey, boolean> = {
  bugShare: false,
  carryOver: false,
  cycleTime: false,
  sayDo: true,
  velocity: true,
};

export function kpiValue(
  summary: SprintMetricsPeriodSummary | null,
  key: SprintMetricsKpiKey
): number | null {
  if (!summary) return null;
  switch (key) {
    case 'sayDo':
      return summary.sayDoPercent;
    case 'velocity':
      return summary.sprintCount > 0 ? summary.velocityPerSprint : null;
    case 'cycleTime':
      return summary.cycleTime?.p50Days ?? null;
    case 'carryOver':
      return summary.carryOverPercent;
    case 'bugShare':
      return bugSharePercent(summary);
  }
}

export type KpiTrend = 'better' | 'same' | 'worse';

/**
 * Порог «на уровне»: колебания меньше — шум между кварталами.
 * Проценты — в п.п., скорость и cycle time — доля от прошлого значения.
 */
function trendTolerance(key: SprintMetricsKpiKey, previous: number): number {
  if (key === 'velocity') return Math.abs(previous) * 0.03;
  if (key === 'cycleTime') return Math.abs(previous) * 0.05;
  return 2;
}

/** Изменение к прошлому периоду с учётом того, что для части метрик меньше — лучше. */
export function kpiTrend(
  key: SprintMetricsKpiKey,
  current: number | null,
  previous: number | null
): { delta: number; trend: KpiTrend } | null {
  if (current == null || previous == null) return null;
  const delta = current - previous;
  if (Math.abs(delta) < trendTolerance(key, previous)) return { delta, trend: 'same' };
  const improved = HIGHER_IS_BETTER[key] ? delta > 0 : delta < 0;
  return { delta, trend: improved ? 'better' : 'worse' };
}

/** Последний квартал с закончившимися спринтами и предыдущий к нему. */
export function pickQuarterComparison(rows: SprintMetricsQuarterRow[]): {
  current: SprintMetricsQuarterRow | null;
  previous: SprintMetricsQuarterRow | null;
} {
  const withData = rows.filter((row) => row.summary != null);
  return {
    current: withData.at(-1) ?? null,
    previous: withData.at(-2) ?? null,
  };
}

function formatCsvNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '';
  return String(Math.round(value * 10) / 10);
}

function escapeCsvCell(value: string): string {
  return /[",\n;]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

interface SprintMetricsCsvLabels {
  bugShare: string;
  carryOver: string;
  cycleP50: string;
  cycleP85: string;
  doneSp: string;
  flowEfficiency: string;
  goals: string;
  quarter: string;
  sayDo: string;
  scopeChange: string;
  sprint: string;
  throughput: string;
}

/** CSV по спринтам: одна строка — спринт, значения как на дашборде. */
export function buildSprintMetricsCsv(rows: SprintMetricsSprintRow[], labels: SprintMetricsCsvLabels): string {
  const header = [
    labels.quarter,
    labels.sprint,
    labels.doneSp,
    labels.throughput,
    labels.sayDo,
    labels.scopeChange,
    labels.carryOver,
    labels.cycleP50,
    labels.cycleP85,
    labels.flowEfficiency,
    labels.goals,
    labels.bugShare,
  ];
  const lines = rows.map(({ quarter, name, summary }) => [
    quarter,
    name,
    formatCsvNumber(summary.done.sp),
    formatCsvNumber(summary.done.count),
    formatCsvNumber(summary.sayDoPercent),
    formatCsvNumber(summary.scopeChangePercent),
    formatCsvNumber(summary.carryOverPercent),
    formatCsvNumber(summary.cycleTime?.p50Days),
    formatCsvNumber(summary.cycleTime?.p85Days),
    formatCsvNumber(summary.flowEfficiencyPercent),
    formatCsvNumber(summary.goalsPercent),
    formatCsvNumber(bugSharePercent(summary)),
  ]);
  return [header, ...lines].map((cells) => cells.map(escapeCsvCell).join(',')).join('\n');
}
