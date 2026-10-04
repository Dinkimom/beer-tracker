/**
 * Факты к ретро: состав спринта и поток.
 * Длительности — рабочие дни планера (пн–пт, 9:00–18:00), статистика по задаче (среднее и p90).
 * «Взяли» считается по дате создания: в сохранённом changelog нет поля спринта.
 */

import type { Task } from '@/types';

import { readChangelogPointValue } from '@/lib/burndown/changelogPointValue';
import { getWorkingHoursBetween } from '@/utils/dateUtils';
import { WORKDAY_END_MS, WORKDAY_START_MS } from '@/utils/dateUtilsHelpers';
import { mapStatus } from '@/utils/statusMapper';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WORKDAY_MS = WORKDAY_END_MS - WORKDAY_START_MS;
const NAME_LIMIT = 50;

const DECLINED_KEYS = new Set([
  'wontbedone',
  'wontdo',
  'wontfix',
  'cancelled',
  'canceled',
  'declined',
  'rejected',
]);

const EXCLUDED_TYPES = new Set(['epic', 'эпик', 'subbug', 'subtask']);

const REVIEW_KEYS = new Set(['review', 'inreview', 'codereview']);
const READY_TEST_KEYS = new Set([
  'readyfortest',
  'readyfortesting',
  'готовоктесту',
  'готовоктестированию',
]);
const TESTING_KEYS = new Set(['intesting', 'testing']);
const READY_DEPLOY_KEYS = new Set(['readyfordeploy', 'readyfordeployment', 'readytodeploy']);
const ACTIVE_KEYS = new Set(['inprogress']);
const BLOCKED_KEYS = new Set(['blocked', 'paused', 'defect']);

const RETRO_QUEUE_STAGES = ['review', 'readyForTest', 'testing', 'readyForDeploy'] as const;

export type RetroQueueStage = (typeof RETRO_QUEUE_STAGES)[number];

type FlowStage = 'active' | 'blocked' | 'readyForDeploy' | 'readyForTest' | 'review' | 'testing';

export interface RetroFactChangelogEntry {
  fields?: Array<{
    field: { id: string };
    from?: unknown;
    to?: unknown;
  }>;
  updatedAt: string;
}

export interface RetroFactIssue {
  assignee?: string;
  changelog: RetroFactChangelogEntry[];
  createdAt?: string;
  /** Текущий статус — отказ (won't do / cancelled), не поставка. */
  declined: boolean;
  /** Текущий статус — сделано по правилам завершения, и это не отказ. */
  done: boolean;
  id: string;
  name: string;
  storyPoints?: number;
}

export interface RetroFactsSprint {
  endMs: number;
  open: boolean;
  startMs: number;
}

interface RetroFactsInput {
  issues: RetroFactIssue[];
  nowMs: number;
  sprint: RetroFactsSprint;
}

interface RetroDurationStat {
  meanDays: number;
  p90Days: number;
  sampleSize: number;
}

interface RetroFactsOutlier {
  days: number;
  id: string;
  name: string;
}

interface RetroFactsStageStat extends RetroDurationStat {
  stage: RetroQueueStage;
}

interface RetroFactsFlow {
  coding: RetroDurationStat;
  efficiencyPercent: number;
  noCodingCount: number;
  population: number;
  waiting: RetroDurationStat;
}

interface RetroFactsDataQuality {
  /** Закрыта по текущему статусу, перехода в Done в окне спринта нет. */
  closedWithoutTransition: number;
  committedApproximatedByCreatedAt: true;
  estimateDrift: { count: number; fromSp: number; toSp: number };
  missingCreatedAt: number;
  missingStatusHistory: number;
  unassigned: number;
}

export interface RetroFacts {
  addedAfterStart: number;
  asOfMs: number;
  bottleneck: RetroFactsStageStat | null;
  bottleneckRunnerUp: RetroFactsStageStat | null;
  carryOver: { count: number; kind: 'forecast' | 'unavailable' };
  closedTotal: number;
  committed: number;
  committedDone: number;
  cycleTime: RetroDurationStat | null;
  dataQuality: RetroFactsDataQuality;
  declined: number;
  flow: RetroFactsFlow | null;
  outliers: RetroFactsOutlier[];
  sprintOpen: boolean;
}

interface StatusVisit {
  endMs: number;
  stage: FlowStage;
  startMs: number;
}

interface StatusWalk {
  doneAtMs: number | null;
  hasStatusHistory: boolean;
  visits: StatusVisit[];
}

interface IssueRow {
  added: boolean;
  closed: boolean;
  closedWithoutTransition: boolean;
  codingDays: number;
  committed: boolean;
  currentlyDone: boolean;
  cycleDays: number | null;
  declined: boolean;
  drift: { from: number; to: number } | null;
  dwell: Partial<Record<RetroQueueStage, number>>;
  id: string;
  missingCreated: boolean;
  missingStatusHistory: boolean;
  name: string;
  unassigned: boolean;
  waitingDays: number;
}

function normalizeStatusKey(statusKey: string): string {
  return statusKey.trim().toLowerCase().replaceAll(/[^a-z0-9а-яё]+/gi, '');
}

export function isDeclinedStatus(statusKey: string | undefined): boolean {
  if (!statusKey) return false;
  return DECLINED_KEYS.has(normalizeStatusKey(statusKey));
}

function isDoneStatusKey(statusKey: string): boolean {
  if (isDeclinedStatus(statusKey)) return false;
  return mapStatus(statusKey) === 'done';
}

function flowStageOf(statusKey: string): FlowStage | null {
  const key = normalizeStatusKey(statusKey);
  if (REVIEW_KEYS.has(key)) return 'review';
  if (READY_TEST_KEYS.has(key)) return 'readyForTest';
  if (TESTING_KEYS.has(key)) return 'testing';
  if (READY_DEPLOY_KEYS.has(key)) return 'readyForDeploy';
  if (BLOCKED_KEYS.has(key) || mapStatus(key) === 'paused') return 'blocked';
  if (ACTIVE_KEYS.has(key) || mapStatus(key) === 'in-progress') return 'active';
  return null;
}

function endpointStatusKey(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const key = record.key ?? record.id ?? record.display;
  return typeof key === 'string' && key.trim() ? key : null;
}

function workingDaysBetween(startMs: number, endMs: number): number {
  if (endMs <= startMs) return 0;
  return getWorkingHoursBetween(startMs, endMs) / WORKDAY_MS;
}

function overlapDays(startMs: number, endMs: number, clipStart: number, clipEnd: number): number {
  return workingDaysBetween(Math.max(startMs, clipStart), Math.min(endMs, clipEnd));
}

interface StatusCursor {
  currentKey: string | null;
  currentStart: number | null;
  doneAtMs: number | null;
  hasStatusHistory: boolean;
  visits: StatusVisit[];
  windowEndMs: number;
}

function closeStatusVisit(cursor: StatusCursor, atMs: number): void {
  if (cursor.currentKey == null || cursor.currentStart == null) return;
  const stage = flowStageOf(cursor.currentKey);
  const endMs = Math.min(atMs, cursor.windowEndMs);
  if (stage && endMs > cursor.currentStart) {
    cursor.visits.push({ endMs, stage, startMs: cursor.currentStart });
  }
  cursor.currentStart = null;
}

function applyStatusEntry(cursor: StatusCursor, entry: RetroFactChangelogEntry): void {
  const atMs = Date.parse(entry.updatedAt);
  if (!Number.isFinite(atMs) || atMs > cursor.windowEndMs) return;
  const field = entry.fields?.find((item) => item.field.id === 'status');
  const toKey = field ? endpointStatusKey(field.to) : null;
  if (!toKey) return;
  cursor.hasStatusHistory = true;
  if (toKey === cursor.currentKey) return;
  closeStatusVisit(cursor, atMs);
  cursor.doneAtMs = isDoneStatusKey(toKey) ? atMs : null;
  cursor.currentKey = toKey;
  cursor.currentStart = atMs;
}

function walkStatuses(entries: RetroFactChangelogEntry[], windowEndMs: number): StatusWalk {
  const cursor: StatusCursor = {
    currentKey: null,
    currentStart: null,
    doneAtMs: null,
    hasStatusHistory: false,
    visits: [],
    windowEndMs,
  };
  const sorted = [...entries].sort(
    (left, right) => Date.parse(left.updatedAt) - Date.parse(right.updatedAt)
  );
  for (const entry of sorted) applyStatusEntry(cursor, entry);
  closeStatusVisit(cursor, windowEndMs);
  const stillDone = cursor.currentKey != null && isDoneStatusKey(cursor.currentKey);
  return {
    doneAtMs: stillDone ? cursor.doneAtMs : null,
    hasStatusHistory: cursor.hasStatusHistory,
    visits: cursor.visits,
  };
}

function percentileInc(sorted: number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0] ?? 0;
  const rank = (percentile / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  const lowValue = sorted[low] ?? 0;
  const highValue = sorted[high] ?? lowValue;
  if (low === high) return lowValue;
  return lowValue + (highValue - lowValue) * (rank - low);
}

function durationStat(values: number[]): RetroDurationStat {
  const sorted = [...values].sort((left, right) => left - right);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    meanDays: sorted.length > 0 ? total / sorted.length : 0,
    p90Days: percentileInc(sorted, 90),
    sampleSize: sorted.length,
  };
}

function membershipOf(
  createdAt: string | undefined,
  planningCutMs: number
): 'added' | 'committed' | 'unknown' {
  if (!createdAt) return 'unknown';
  const createdMs = Date.parse(createdAt);
  if (!Number.isFinite(createdMs)) return 'unknown';
  return createdMs < planningCutMs ? 'committed' : 'added';
}

function estimateDriftOf(
  issue: RetroFactIssue,
  planningCutMs: number
): { from: number; to: number } | null {
  const sorted = [...issue.changelog].sort(
    (left, right) => Date.parse(left.updatedAt) - Date.parse(right.updatedAt)
  );
  let atCut: number | null = null;
  let first: number | null = null;
  let latest: number | null = null;
  for (const entry of sorted) {
    const field = entry.fields?.find((item) => item.field.id === 'storyPoints');
    if (!field) continue;
    const next = readChangelogPointValue(field.to);
    if (next == null) continue;
    first ??= next;
    latest = next;
    const atMs = Date.parse(entry.updatedAt);
    if (Number.isFinite(atMs) && atMs <= planningCutMs) atCut = next;
  }
  const anchor = atCut ?? first;
  const current = issue.storyPoints ?? latest;
  if (anchor == null || current == null || Math.abs(anchor - current) < 1e-6) return null;
  return { from: anchor, to: current };
}

function dwellByStage(
  visits: StatusVisit[],
  sprintStartMs: number,
  windowEndMs: number
): Partial<Record<RetroQueueStage, number>> {
  const dwell: Partial<Record<RetroQueueStage, number>> = {};
  for (const visit of visits) {
    if (visit.stage === 'active' || visit.stage === 'blocked') continue;
    const days = overlapDays(visit.startMs, visit.endMs, sprintStartMs, windowEndMs);
    if (days <= 0) continue;
    dwell[visit.stage] = (dwell[visit.stage] ?? 0) + days;
  }
  return dwell;
}

function clippedStageDays(
  visits: StatusVisit[],
  stage: 'active' | 'waiting',
  sprintStartMs: number,
  windowEndMs: number
): number {
  let total = 0;
  for (const visit of visits) {
    const waiting = visit.stage !== 'active';
    const matches = stage === 'active' ? visit.stage === 'active' : waiting;
    if (!matches) continue;
    total += overlapDays(visit.startMs, visit.endMs, sprintStartMs, windowEndMs);
  }
  return total;
}

function cycleDaysOf(visits: StatusVisit[]): number {
  let total = 0;
  let active = 0;
  for (const visit of visits) {
    const days = workingDaysBetween(visit.startMs, visit.endMs);
    total += days;
    if (visit.stage === 'active') active += days;
  }
  return active > 0 ? total : -1;
}

function createdInSprint(createdAt: string | undefined, sprintStartMs: number, windowEndMs: number): boolean {
  if (!createdAt) return false;
  const createdMs = Date.parse(createdAt);
  return Number.isFinite(createdMs) && createdMs >= sprintStartMs && createdMs <= windowEndMs;
}

function issueClosedInWindow(
  issue: RetroFactIssue,
  walk: StatusWalk,
  sprintStartMs: number,
  windowEndMs: number
): { closed: boolean; closedWithoutTransition: boolean } {
  if (issue.declined) return { closed: false, closedWithoutTransition: false };
  const doneByTransition =
    walk.doneAtMs != null && walk.doneAtMs >= sprintStartMs && walk.doneAtMs <= windowEndMs;
  if (doneByTransition) return { closed: true, closedWithoutTransition: false };
  const closedWithoutTransition =
    issue.done && !walk.hasStatusHistory && createdInSprint(issue.createdAt, sprintStartMs, windowEndMs);
  return { closed: closedWithoutTransition, closedWithoutTransition };
}

function flowNumbersForClosed(
  walk: StatusWalk,
  closed: boolean,
  sprintStartMs: number,
  windowEndMs: number
): Pick<IssueRow, 'codingDays' | 'cycleDays' | 'dwell' | 'waitingDays'> {
  if (!closed || !walk.hasStatusHistory) {
    return { codingDays: 0, cycleDays: null, dwell: {}, waitingDays: 0 };
  }
  const cycle = cycleDaysOf(walk.visits);
  return {
    codingDays: clippedStageDays(walk.visits, 'active', sprintStartMs, windowEndMs),
    cycleDays: cycle >= 0 ? cycle : null,
    dwell: dwellByStage(walk.visits, sprintStartMs, windowEndMs),
    waitingDays: clippedStageDays(walk.visits, 'waiting', sprintStartMs, windowEndMs),
  };
}

function analyzeIssue(issue: RetroFactIssue, sprint: RetroFactsSprint, windowEndMs: number): IssueRow {
  const planningCutMs = sprint.startMs + MS_PER_DAY;
  const membership = membershipOf(issue.createdAt, planningCutMs);
  const walk = walkStatuses(issue.changelog, windowEndMs);
  const closedFlags = issueClosedInWindow(issue, walk, sprint.startMs, windowEndMs);
  const flow = flowNumbersForClosed(walk, closedFlags.closed, sprint.startMs, windowEndMs);

  return {
    added: membership === 'added',
    closed: closedFlags.closed,
    closedWithoutTransition: closedFlags.closedWithoutTransition,
    codingDays: flow.codingDays,
    committed: membership === 'committed',
    currentlyDone: issue.done,
    cycleDays: flow.cycleDays,
    declined: issue.declined,
    drift: estimateDriftOf(issue, planningCutMs),
    dwell: flow.dwell,
    id: issue.id,
    missingCreated: membership === 'unknown',
    missingStatusHistory: !walk.hasStatusHistory,
    name: issue.name.trim().slice(0, NAME_LIMIT),
    unassigned: !issue.assignee?.trim(),
    waitingDays: flow.waitingDays,
  };
}

function stageStats(rows: IssueRow[]): RetroFactsStageStat[] {
  const stats: RetroFactsStageStat[] = [];
  for (const stage of RETRO_QUEUE_STAGES) {
    const values = rows
      .map((row) => row.dwell[stage])
      .filter((days): days is number => days != null && days > 0);
    if (values.length === 0) continue;
    stats.push({ stage, ...durationStat(values) });
  }
  stats.sort(
    (left, right) => right.meanDays - left.meanDays || right.p90Days - left.p90Days
  );
  return stats;
}

function flowOf(rows: IssueRow[]): RetroFactsFlow | null {
  const population = rows.filter((row) => row.closed && !row.missingStatusHistory);
  if (population.length === 0) return null;
  const codingValues = population.map((row) => row.codingDays);
  const waitingValues = population.map((row) => row.waitingDays);
  const codingSum = codingValues.reduce((sum, value) => sum + value, 0);
  const waitingSum = waitingValues.reduce((sum, value) => sum + value, 0);
  const denominator = codingSum + waitingSum;
  return {
    coding: durationStat(codingValues),
    efficiencyPercent: denominator > 0 ? Math.round((100 * codingSum) / denominator) : 0,
    noCodingCount: population.filter((row) => row.codingDays <= 0).length,
    population: population.length,
    waiting: durationStat(waitingValues),
  };
}

function outliersOf(rows: IssueRow[], cycleTime: RetroDurationStat | null): RetroFactsOutlier[] {
  if (!cycleTime) return [];
  return rows
    .filter((row) => row.cycleDays != null && row.cycleDays > cycleTime.p90Days)
    .map((row) => ({ days: row.cycleDays ?? 0, id: row.id, name: row.name }))
    .sort((left, right) => right.days - left.days);
}

export function selectRetroFactTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => {
    if (task.isLocalTask || task.localDraftKind) return false;
    if (task.id.startsWith('comment:')) return false;
    if (task.team === 'QA') return false;
    const type = normalizeStatusKey(task.type ?? '');
    return !EXCLUDED_TYPES.has(type);
  });
}

export function computeRetroFacts(input: RetroFactsInput): RetroFacts {
  const windowEndMs = Math.min(input.sprint.endMs, input.nowMs);
  const rows = input.issues.map((issue) => analyzeIssue(issue, input.sprint, windowEndMs));
  const cycleValues = rows
    .map((row) => row.cycleDays)
    .filter((days): days is number => days != null);
  const cycleTime = cycleValues.length > 0 ? durationStat(cycleValues) : null;
  const stages = stageStats(rows);
  const driftRows = rows.filter((row) => row.drift != null);
  const carryCount = rows.filter((row) => !row.closed && !row.declined && !row.currentlyDone).length;

  return {
    addedAfterStart: rows.filter((row) => row.added).length,
    asOfMs: windowEndMs,
    bottleneck: stages[0] ?? null,
    bottleneckRunnerUp: stages[1] ?? null,
    carryOver: input.sprint.open
      ? { count: carryCount, kind: 'forecast' }
      : { count: 0, kind: 'unavailable' },
    closedTotal: rows.filter((row) => row.closed).length,
    committed: rows.filter((row) => row.committed).length,
    committedDone: rows.filter((row) => row.committed && row.closed).length,
    cycleTime,
    dataQuality: {
      closedWithoutTransition: rows.filter((row) => row.closedWithoutTransition).length,
      committedApproximatedByCreatedAt: true,
      estimateDrift: {
        count: driftRows.length,
        fromSp: driftRows.reduce((sum, row) => sum + (row.drift?.from ?? 0), 0),
        toSp: driftRows.reduce((sum, row) => sum + (row.drift?.to ?? 0), 0),
      },
      missingCreatedAt: rows.filter((row) => row.missingCreated).length,
      missingStatusHistory: rows.filter((row) => row.missingStatusHistory).length,
      unassigned: rows.filter((row) => row.unassigned).length,
    },
    declined: rows.filter((row) => row.declined).length,
    flow: flowOf(rows),
    outliers: outliersOf(rows, cycleTime),
    sprintOpen: input.sprint.open,
  };
}
