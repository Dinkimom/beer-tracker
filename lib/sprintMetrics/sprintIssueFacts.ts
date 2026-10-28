/**
 * Факты по задаче за спринт из полного changelog трекера (включая поле sprint):
 * взята на старте / добавлена / снята / закрыта / перенесена, оценка и поток.
 */

import type { SprintIssueFact, SprintWorkCategory } from './sprintMetricsTypes';
import type { SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';
import type { YtrackerBurndownChangelogEntry, YtrackerBurndownIssue } from '@/lib/ytrackerRawIssues';
import type { TrackerIssue } from '@/types/tracker';

import { applyFieldToTaskState, type TaskState } from '@/lib/burndown/burndownFromChangelogReplayHelpers';
import { buildTaskStateAtSprintStart } from '@/lib/burndown/burndownFromChangelogReplaySteps';
import { extractStatusKey } from '@/lib/burndown/extractStatusKey';
import { sprintArrayContainsSprint } from '@/lib/burndown/sprintMembership';
import {
  analyzeRetroFactIssue,
  isDeclinedStatus,
  isDeliveredStatusKey,
  isRetroExcludedType,
} from '@/lib/retro/retroFacts';
import { isStatusKeyCompleted } from '@/lib/sprints/sprintTaskCompletion';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Задачи, взятые в первый день, — часть плана (как в фактах ретро). */
const PLANNING_GRACE_MS = MS_PER_DAY;
/** Снятие со спринта в последние сутки — перенос при закрытии, а не уменьшение объёма. */
const CARRY_OVER_GRACE_MS = MS_PER_DAY;

const BUG_TYPES = new Set(['bug', 'subbug', 'баг', 'defect', 'ошибка', 'incident', 'инцидент']);
const TECH_TYPES = new Set(['techdebt', 'tech', 'техдолг', 'refactoring', 'рефакторинг', 'chore', 'spike']);
const FEATURE_TYPES = new Set(['story', 'task', 'feature', 'newfeature', 'improvement', 'задача', 'история', 'улучшение']);

interface SprintFactsWindow {
  /** Правила завершения организации (SP done); без них — эвристика по ключу статуса. */
  completionRules?: SprintTaskCompletionRules | null;
  endMs: number;
  nowMs: number;
  sprintId?: string;
  sprintName: string;
  startMs: number;
}

function normalizeTypeKey(raw: string | undefined): string {
  return (raw ?? '').trim().toLowerCase().replaceAll(/[^a-z0-9а-яё]+/gi, '');
}

export function categorizeIssueType(typeKey: string | undefined): SprintWorkCategory {
  const key = normalizeTypeKey(typeKey);
  if (BUG_TYPES.has(key)) return 'bug';
  if (TECH_TYPES.has(key)) return 'tech';
  if (FEATURE_TYPES.has(key)) return 'feature';
  return 'other';
}

/** Задачи, которые считаются поставкой спринта (без эпиков и QA-подзадач). */
function isSprintMetricsIssue(issue: TrackerIssue): boolean {
  return !isRetroExcludedType(issue.type?.key);
}

function entryTime(entry: YtrackerBurndownChangelogEntry): number {
  return new Date(entry.updatedAt).getTime();
}

function statusFieldOf(entry: YtrackerBurndownChangelogEntry) {
  return entry.fields?.find((field) => field?.field?.id === 'status');
}

/**
 * Статус на момент времени по истории: последний переход до него, иначе исходный статус
 * первого перехода после, иначе текущий.
 */
export function statusKeyAt(
  rawChangelog: YtrackerBurndownChangelogEntry[],
  atMs: number,
  currentKey: string
): string {
  let before: string | undefined;
  for (const entry of rawChangelog) {
    const field = statusFieldOf(entry);
    if (!field) continue;
    if (entryTime(entry) >= atMs) return before ?? extractStatusKey(field.from) ?? currentKey;
    before = extractStatusKey(field.to) ?? before;
  }
  return before ?? currentKey;
}

/**
 * Членство в спринте до первой смены поля sprint после `atMs`, если раньше поле не менялось:
 * реплей burndown в этом случае считает задачу «в спринте», хотя её добавили позже.
 */
function inSprintBeforeFirstLaterChange(
  rawChangelog: YtrackerBurndownChangelogEntry[],
  atMs: number,
  window: SprintFactsWindow
): boolean | null {
  for (const entry of rawChangelog) {
    const field = entry.fields?.find((item) => item?.field?.id === 'sprint');
    if (!field) continue;
    if (entryTime(entry) < atMs) return null;
    return sprintArrayContainsSprint(field.from, window.sprintName, window.sprintId);
  }
  return null;
}

interface MembershipReplay {
  addedDuringSprint: boolean;
  end: TaskState;
  removedAtMs: number | null;
}

function applyMembershipEntry(
  entry: YtrackerBurndownChangelogEntry,
  window: SprintFactsWindow,
  replay: MembershipReplay
): void {
  const t = entryTime(entry);
  for (const field of entry.fields ?? []) {
    const before = replay.end.inSprint;
    applyFieldToTaskState(field, window.sprintName, window.sprintId, replay.end, window.completionRules);
    if (!before && replay.end.inSprint) {
      replay.addedDuringSprint = true;
      replay.removedAtMs = null;
    }
    if (before && !replay.end.inSprint) replay.removedAtMs = t;
  }
}

function replayMembership(
  yt: YtrackerBurndownIssue,
  start: TaskState,
  window: SprintFactsWindow,
  fromMs: number,
  toMs: number
): MembershipReplay {
  const replay: MembershipReplay = { addedDuringSprint: false, end: { ...start }, removedAtMs: null };
  for (const entry of yt.rawChangelog ?? []) {
    const t = entryTime(entry);
    if (t > toMs) break;
    if (t >= fromMs) applyMembershipEntry(entry, window, replay);
  }
  return replay;
}

function createdAfter(issue: TrackerIssue, cutMs: number): boolean {
  if (!issue.createdAt) return false;
  const created = Date.parse(issue.createdAt);
  return Number.isFinite(created) && created > cutMs;
}

interface MembershipFlags {
  added: boolean;
  carriedOver: boolean;
  committed: boolean;
  declined: boolean;
  done: boolean;
  removed: boolean;
}

function membershipFlags(input: {
  createdAfterCut: boolean;
  declined: boolean;
  open: boolean;
  replay: MembershipReplay;
  start: TaskState;
  window: SprintFactsWindow;
}): MembershipFlags {
  const { replay, start, window } = input;
  // «Сделано» = SP done по правилам организации; отказ (declined) — не поставка (семантика метрик).
  const committed = start.inSprint && !start.spDone && !input.createdAfterCut;
  const added = !committed && !start.spDone && (replay.addedDuringSprint || input.createdAfterCut);
  const taken = committed || added;
  const done = taken && replay.end.inSprint && replay.end.spDone && !input.declined;
  const leftAtClose =
    replay.removedAtMs != null && replay.removedAtMs >= window.endMs - CARRY_OVER_GRACE_MS;
  const stillOpen = !replay.end.spDone && !input.declined;
  const carriedOver = !input.open && taken && stillOpen && (replay.end.inSprint || leftAtClose);
  const removed = taken && replay.removedAtMs != null && !carriedOver && !done;
  return { added, carriedOver, committed, declined: taken && input.declined, done, removed };
}

function flowOf(
  issue: TrackerIssue,
  yt: YtrackerBurndownIssue,
  window: SprintFactsWindow,
  open: boolean,
  windowEndMs: number
): Pick<SprintIssueFact, 'codingDays' | 'cycleDays' | 'dwell' | 'waitingDays'> {
  const statusKey = issue.status?.key ?? yt.statusKey;
  const row = analyzeRetroFactIssue(
    {
      assignee: issue.assignee?.display,
      changelog: yt.rawChangelog ?? [],
      createdAt: issue.createdAt,
      declined: isDeclinedStatus(statusKey),
      done: isDeliveredStatusKey(statusKey, window.completionRules),
      id: issue.key,
      name: issue.summary ?? issue.key,
      storyPoints: issue.storyPoints,
    },
    { endMs: window.endMs, open, startMs: window.startMs },
    windowEndMs,
    window.completionRules
  );
  return {
    codingDays: row.codingDays,
    cycleDays: row.cycleDays,
    dwell: row.dwell,
    waitingDays: row.waitingDays,
  };
}

/** Факты одной задачи; null — задача ни разу не была частью спринта. */
export function buildSprintIssueFact(
  issue: TrackerIssue,
  yt: YtrackerBurndownIssue,
  window: SprintFactsWindow
): SprintIssueFact | null {
  const open = window.nowMs < window.endMs;
  const windowEndMs = Math.min(window.endMs, window.nowMs);
  const cutMs = window.startMs + PLANNING_GRACE_MS;
  const createdAfterCut = createdAfter(issue, cutMs);
  const start = buildTaskStateAtSprintStart(
    yt,
    window.sprintName,
    window.sprintId,
    cutMs,
    windowEndMs,
    window.completionRules
  );
  start.inSprint =
    inSprintBeforeFirstLaterChange(yt.rawChangelog ?? [], cutMs, window) ?? start.inSprint;
  start.spDone =
    !createdAfterCut &&
    isStatusKeyCompleted(statusKeyAt(yt.rawChangelog ?? [], cutMs, yt.statusKey), window.completionRules);
  const replay = replayMembership(yt, start, window, cutMs, windowEndMs);
  const declined = isDeclinedStatus(issue.status?.key ?? yt.statusKey);
  const flags = membershipFlags({
    createdAfterCut,
    declined,
    open,
    replay,
    start,
    window,
  });
  if (!flags.committed && !flags.added) return null;

  const flow = flags.done
    ? flowOf(issue, yt, window, open, windowEndMs)
    : { codingDays: 0, cycleDays: null, dwell: {}, waitingDays: 0 };
  return {
    ...flags,
    ...flow,
    category: categorizeIssueType(issue.type?.key),
    key: issue.key,
    spEnd: replay.end.sp,
    spStart: flags.committed ? start.sp : replay.end.sp,
    team: issue.functionalTeam?.trim() || null,
    tpEnd: replay.end.tp,
  };
}

/** Факты всех задач спринта (задачи без changelog пропускаются). */
export function buildSprintIssueFacts(
  issues: TrackerIssue[],
  burndownIssues: YtrackerBurndownIssue[],
  window: SprintFactsWindow
): SprintIssueFact[] {
  const ytByKey = new Map(burndownIssues.map((yt) => [yt.issueKey, yt]));
  const facts: SprintIssueFact[] = [];
  for (const issue of issues) {
    const yt = ytByKey.get(issue.key);
    if (!yt || !isSprintMetricsIssue(issue)) continue;
    const fact = buildSprintIssueFact(issue, yt, window);
    if (fact) facts.push(fact);
  }
  return facts;
}
