/**
 * Агрегаты метрик из фактов по задачам: спринт, квартал, произвольный период.
 * Чистые функции — используются и на сервере, и в UI (фильтр по команде без запроса).
 */

import type {
  SprintGoalsTally,
  SprintIssueFact,
  SprintMetricsRecord,
  SprintMetricsSummary,
  SprintWorkCategory,
} from './sprintMetricsTypes';
import type { RetroQueueStage } from '@/lib/retro/retroFacts';

const STAGES: RetroQueueStage[] = ['review', 'readyForTest', 'testing', 'readyForDeploy'];
const CATEGORIES: SprintWorkCategory[] = ['feature', 'bug', 'tech', 'other'];

function sumSp(facts: SprintIssueFact[], pick: (fact: SprintIssueFact) => number): number {
  return facts.reduce((total, fact) => total + pick(fact), 0);
}

function countAndSp(facts: SprintIssueFact[], pick: (fact: SprintIssueFact) => number) {
  return { count: facts.length, sp: sumSp(facts, pick) };
}

function percent(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((100 * part) / whole);
}

/** Процент по SP, а если SP никто не ставит — по штукам. */
function percentBySpOrCount(
  part: { count: number; sp: number },
  whole: { count: number; sp: number }
): number | null {
  if (whole.sp > 0) return percent(part.sp, whole.sp);
  return percent(part.count, whole.count);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  const lowValue = sorted[low] ?? 0;
  const highValue = sorted[high] ?? lowValue;
  return lowValue + (highValue - lowValue) * (rank - low);
}

function cycleTimeOf(done: SprintIssueFact[]): SprintMetricsSummary['cycleTime'] {
  const values = done
    .map((fact) => fact.cycleDays)
    .filter((days): days is number => days != null);
  if (values.length === 0) return null;
  return {
    p50Days: percentile(values, 50),
    p85Days: percentile(values, 85),
    sampleSize: values.length,
  };
}

function flowEfficiencyOf(done: SprintIssueFact[]): number | null {
  const withFlow = done.filter((fact) => fact.cycleDays != null);
  const coding = sumSp(withFlow, (fact) => fact.codingDays);
  const waiting = sumSp(withFlow, (fact) => fact.waitingDays);
  return percent(coding, coding + waiting);
}

function waitingByStageOf(done: SprintIssueFact[]): Partial<Record<RetroQueueStage, number>> {
  const result: Partial<Record<RetroQueueStage, number>> = {};
  for (const stage of STAGES) {
    const values = done
      .map((fact) => fact.dwell[stage])
      .filter((days): days is number => days != null && days > 0);
    if (values.length > 0) result[stage] = values.reduce((a, b) => a + b, 0) / values.length;
  }
  return result;
}

function mixOf(done: SprintIssueFact[]): SprintMetricsSummary['mix'] {
  const mix = {} as SprintMetricsSummary['mix'];
  for (const category of CATEGORIES) {
    mix[category] = countAndSp(
      done.filter((fact) => fact.category === category),
      (fact) => fact.spEnd
    );
  }
  return mix;
}

/** Самая долгая очередь ожидания (среднее время на задачу). */
export function bottleneckStage(
  waitingByStage: Partial<Record<RetroQueueStage, number>>
): RetroQueueStage | null {
  let best: RetroQueueStage | null = null;
  for (const stage of STAGES) {
    const days = waitingByStage[stage] ?? 0;
    if (days > 0 && (best == null || days > (waitingByStage[best] ?? 0))) best = stage;
  }
  return best;
}

export function summarizeSprintFacts(input: {
  facts: SprintIssueFact[];
  goals: SprintGoalsTally;
  open: boolean;
}): SprintMetricsSummary {
  const { facts } = input;
  const committed = facts.filter((fact) => fact.committed);
  const added = facts.filter((fact) => fact.added);
  const done = facts.filter((fact) => fact.done);
  const carried = facts.filter((fact) => fact.carriedOver);
  const committedTotals = countAndSp(committed, (fact) => fact.spStart);
  const committedDone = countAndSp(
    committed.filter((fact) => fact.done),
    (fact) => fact.spStart
  );
  const waitingByStage = waitingByStageOf(done);

  return {
    added: countAndSp(added, (fact) => fact.spEnd),
    carryOver: input.open ? null : countAndSp(carried, (fact) => fact.spEnd),
    carryOverPercent: input.open ? null : percent(carried.length, committed.length + added.length),
    committed: committedTotals,
    committedDone,
    cycleTime: cycleTimeOf(done),
    done: { ...countAndSp(done, (fact) => fact.spEnd), tp: sumSp(done, (fact) => fact.tpEnd) },
    flowEfficiencyPercent: flowEfficiencyOf(done),
    goals: input.goals,
    goalsPercent: percent(input.goals.done, input.goals.total),
    mix: mixOf(done),
    removed: { count: facts.filter((fact) => fact.removed).length },
    scopeChangePercent: percent(added.length, committed.length),
    sayDoPercent: percentBySpOrCount(committedDone, committedTotals),
    waitingByStage,
  };
}

/** Факты, отфильтрованные по команде (functionalTeam); null — все. */
export function filterFactsByTeam(facts: SprintIssueFact[], team: string | null): SprintIssueFact[] {
  if (team == null) return facts;
  return facts.filter((fact) => fact.team === team);
}

export function listFactTeams(records: SprintMetricsRecord[]): string[] {
  const teams = new Set<string>();
  for (const record of records) {
    for (const fact of record.facts) {
      if (fact.team) teams.add(fact.team);
    }
  }
  return [...teams].sort((a, b) => a.localeCompare(b));
}

export interface SprintMetricsPeriodSummary extends SprintMetricsSummary {
  sprintCount: number;
  /** Среднее закрытых задач за спринт. */
  throughputPerSprint: number;
  /** Среднее закрытых SP за спринт. */
  velocityPerSprint: number;
}

/**
 * Сводка за период: факты всех спринтов сливаются (проценты взвешены объёмом, перцентили — по всем задачам),
 * скорость — среднее на спринт. Открытые спринты не учитываются.
 */
export function summarizePeriod(
  records: SprintMetricsRecord[],
  team: string | null
): SprintMetricsPeriodSummary | null {
  const closed = records.filter((record) => !record.open);
  if (closed.length === 0) return null;
  const facts = closed.flatMap((record) => filterFactsByTeam(record.facts, team));
  const goals = closed.reduce(
    (total, record) => ({ done: total.done + record.goals.done, total: total.total + record.goals.total }),
    { done: 0, total: 0 }
  );
  const summary = summarizeSprintFacts({ facts, goals, open: false });
  return {
    ...summary,
    sprintCount: closed.length,
    throughputPerSprint: summary.done.count / closed.length,
    velocityPerSprint: summary.done.sp / closed.length,
  };
}

/** Кварталов истории по умолчанию, включая текущий. */
export const DEFAULT_METRICS_QUARTERS = 4;
export const MAX_METRICS_QUARTERS = 8;

function quarterStartMs(year: number, quarterIndex: number): number {
  const normalizedYear = year + Math.floor(quarterIndex / 4);
  const normalizedQuarter = ((quarterIndex % 4) + 4) % 4;
  return Date.UTC(normalizedYear, normalizedQuarter * 3, 1);
}

/** Начало окна истории: начало квартала, `quarters - 1` кварталов назад от текущего. */
export function resolveMetricsWindowStartMs(quarters: number, nowMs: number): number {
  const now = new Date(nowMs);
  const quarterIndex = Math.floor(now.getUTCMonth() / 3) - (quarters - 1);
  return quarterStartMs(now.getUTCFullYear(), quarterIndex);
}

function quarterKeyOf(dateIso: string): string {
  const date = new Date(dateIso);
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${date.getUTCFullYear()}-Q${quarter}`;
}

/** Спринты по кварталам (по дате старта), в хронологическом порядке. */
export function groupRecordsByQuarter(
  records: SprintMetricsRecord[]
): Array<{ quarter: string; records: SprintMetricsRecord[] }> {
  const byQuarter = new Map<string, SprintMetricsRecord[]>();
  for (const record of records) {
    const key = quarterKeyOf(record.startDate);
    const list = byQuarter.get(key) ?? [];
    list.push(record);
    byQuarter.set(key, list);
  }
  return [...byQuarter.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([quarter, list]) => ({ quarter, records: list }));
}
