import type { StatusDuration } from '@/features/task/components/TaskTimeline/types';
import type { Developer, Task, TaskPosition } from '@/types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

import {
  doneFactStatusKeysFromTasks,
  isClosingFactStatusKey,
} from './in-progress-fact/factClosingStatus';

type FactPhaseKind =
  | 'blocked'
  | 'closed'
  | 'defect'
  | 'inprogress'
  | 'intesting'
  | 'readyfortest'
  | 'review';

interface RawIv {
  endMs: number;
  hasOpenEnd: boolean;
  kind: FactPhaseKind;
  startMs: number;
  statusName: string;
  taskId: string;
}

function normalizeStatusKey(key: string): string {
  return key.toLowerCase().replace(/\s+/g, '');
}

function dedupeStatusDurations(a: StatusDuration[], b: StatusDuration[]): StatusDuration[] {
  const seen = new Set<string>();
  const out: StatusDuration[] = [];
  for (const d of [...a, ...b]) {
    const k = `${normalizeStatusKey(d.statusKey)}|${d.startTimeMs}|${d.endTimeMs ?? 'open'}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(d);
  }
  out.sort((x, y) => x.startTimeMs - y.startTimeMs || (x.endTimeMs ?? 0) - (y.endTimeMs ?? 0));
  return out;
}

export function resolveFactDurationsForSwimlaneTask(
  taskId: string,
  swimlaneAssigneeRole: Developer['role'],
  tasksMap: Map<string, Task>,
  durationsByTaskId: Map<string, StatusDuration[]>
): StatusDuration[] {
  const direct = durationsByTaskId.get(taskId) ?? [];
  if (swimlaneAssigneeRole !== 'tester') {
    return direct;
  }
  const task = tasksMap.get(taskId);
  const devId = task?.originalTaskId;
  if (!devId) {
    return direct;
  }
  const fromDev = durationsByTaskId.get(devId) ?? [];
  if (direct.length === 0) {
    return fromDev;
  }
  if (fromDev.length === 0) {
    return direct;
  }
  return dedupeStatusDurations(direct, fromDev);
}

function factPhaseKindTestingFunnelOnly(
  statusKey: string,
  doneStatusKeys: ReadonlySet<string>
): FactPhaseKind | null {
  const n = normalizeStatusKey(statusKey);
  if (isClosingFactStatusKey(statusKey, doneStatusKeys)) return 'closed';
  if (n === 'readyfortest' || n === 'readyfortesting') return 'readyfortest';
  if (n === 'intesting') return 'intesting';
  if (n === 'defect') return 'defect';
  if (n === 'blocked') return 'blocked';
  return null;
}

function devHasStoryPoints(dev: Task): boolean {
  return dev.storyPoints != null && dev.storyPoints > 0;
}

function devHasZeroSpWithTpAndQa(dev: Task): boolean {
  const noSp = dev.storyPoints == null || dev.storyPoints === 0;
  const hasTp = dev.testPoints != null && dev.testPoints > 0;
  const hasQaEng = Boolean(dev.qaEngineer?.trim());
  return noSp && hasTp && hasQaEng;
}

function devAssigneeIsNotQa(dev: Task): boolean {
  const assigneeId = dev.assignee?.trim();
  const qaId = dev.qaEngineer?.trim();
  return Boolean(assigneeId) && (!qaId || assigneeId !== qaId);
}

function devOriginRequiresTestingFunnelOnlyOnQaSwimlane(dev: Task): boolean {
  if (devHasStoryPoints(dev)) return true;
  if (devHasZeroSpWithTpAndQa(dev)) return true;
  const platformNotQa = dev.team !== 'QA';
  return platformNotQa && devAssigneeIsNotQa(dev);
}

function isPureQaCardForFactTimeline(task: Task, tasksMap: Map<string, Task>): boolean {
  const noSp = task.storyPoints == null || task.storyPoints === 0;
  const hasTp = task.testPoints != null && task.testPoints > 0;
  if (!noSp || !hasTp) return false;
  const devId = task.originalTaskId;
  if (!devId) return true;
  const dev = tasksMap.get(devId);
  if (!dev) return false;
  if (devOriginRequiresTestingFunnelOnlyOnQaSwimlane(dev)) return false;
  return true;
}

const PURE_QA_CARD_FACT_PHASE_BY_STATUS: Record<string, FactPhaseKind> = {
  blocked: 'blocked',
  defect: 'defect',
  inprogress: 'inprogress',
  inreview: 'review',
  in_review: 'review',
  intesting: 'intesting',
  readyfortest: 'readyfortest',
  readyfortesting: 'readyfortest',
  review: 'review',
};

function factPhaseKindForPureQaCard(statusKey: string): FactPhaseKind | null {
  return PURE_QA_CARD_FACT_PHASE_BY_STATUS[normalizeStatusKey(statusKey)] ?? null;
}

function factPhaseKindForTesterSwimlane(
  statusKey: string,
  task: Task | undefined,
  tasksMap: Map<string, Task>,
  doneStatusKeys: ReadonlySet<string>
): FactPhaseKind | null {
  if (isClosingFactStatusKey(statusKey, doneStatusKeys)) return 'closed';

  if (!task) {
    return factPhaseKindTestingFunnelOnly(statusKey, doneStatusKeys);
  }

  if (isPureQaCardForFactTimeline(task, tasksMap)) {
    return factPhaseKindForPureQaCard(statusKey);
  }

  return factPhaseKindTestingFunnelOnly(statusKey, doneStatusKeys);
}

function factPhaseKindForDeveloperSwimlane(
  statusKey: string,
  doneStatusKeys: ReadonlySet<string>
): FactPhaseKind | null {
  const n = normalizeStatusKey(statusKey);
  if (isClosingFactStatusKey(statusKey, doneStatusKeys)) return 'closed';
  if (n === 'inprogress') return 'inprogress';
  if (n === 'review' || n === 'inreview' || n === 'in_review') return 'review';
  if (n === 'defect') return 'defect';
  if (n === 'blocked') return 'blocked';
  return null;
}

const CANONICAL_STATUS_BY_KIND: Record<FactPhaseKind, string> = {
  review: 'review',
  closed: 'closed',
  readyfortest: 'readyfortest',
  intesting: 'intesting',
  defect: 'defect',
  blocked: 'blocked',
  inprogress: 'inprogress',
};

function canonicalTimelineStatusKey(kind: FactPhaseKind): string {
  return CANONICAL_STATUS_BY_KIND[kind];
}

function appendMergedInterval(merged: RawIv[], iv: RawIv): void {
  const last = merged[merged.length - 1];
  const sameKind = last && last.kind === iv.kind;
  if (!last || iv.startMs > last.endMs || !sameKind) {
    merged.push({ ...iv });
    return;
  }
  last.endMs = Math.max(last.endMs, iv.endMs);
  last.hasOpenEnd = last.hasOpenEnd || iv.hasOpenEnd;
  if (iv.statusName) last.statusName = iv.statusName;
}

export function mergeIntervalsWithinTask(intervals: RawIv[]): RawIv[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  const merged: RawIv[] = [];
  for (const iv of sorted) {
    appendMergedInterval(merged, iv);
  }
  return merged;
}

interface TaskFactSpan {
  endMs: number;
  indices: number[];
  startMs: number;
}

function collectTaskFactSpans(intervals: RawIv[]): TaskFactSpan[] {
  const byTask = new Map<string, TaskFactSpan>();
  intervals.forEach((iv, index) => {
    const span = byTask.get(iv.taskId);
    if (!span) {
      byTask.set(iv.taskId, { endMs: iv.endMs, indices: [index], startMs: iv.startMs });
      return;
    }
    span.startMs = Math.min(span.startMs, iv.startMs);
    span.endMs = Math.max(span.endMs, iv.endMs);
    span.indices.push(index);
  });
  return [...byTask.values()].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
}

function laneForTaskSpan(span: TaskFactSpan, laneEnds: number[]): number {
  const lane = laneEnds.findIndex((end) => span.startMs >= end);
  if (lane === -1) {
    laneEnds.push(span.endMs);
    return laneEnds.length - 1;
  }
  laneEnds[lane] = span.endMs;
  return lane;
}

/**
 * Весь факт одной задачи — одна дорожка, чтобы стрелки не пересекали чужие бары.
 * Задачи без пересечения по времени делят дорожку.
 */
export function assignLanes(intervals: RawIv[]): number[] {
  const laneByIndex = new Array<number>(intervals.length);
  const laneEnds: number[] = [];
  for (const span of collectTaskFactSpans(intervals)) {
    const lane = laneForTaskSpan(span, laneEnds);
    for (const index of span.indices) {
      laneByIndex[index] = lane;
    }
  }
  return laneByIndex;
}

export function rawToStatusDuration(iv: RawIv, now: number): StatusDuration {
  const ongoing = iv.hasOpenEnd || iv.endMs >= now;
  const endMs = ongoing ? now : iv.endMs;
  const key = canonicalTimelineStatusKey(iv.kind);
  const name = iv.statusName?.trim() || key;
  return {
    statusKey: key,
    statusName: name,
    startTime: new Date(iv.startMs).toISOString(),
    startTimeMs: iv.startMs,
    endTime: ongoing ? null : new Date(iv.endMs).toISOString(),
    endTimeMs: endMs,
    durationMs: Math.max(0, endMs - iv.startMs),
  };
}

function rawIntervalFromStatusDuration(
  tid: string,
  d: StatusDuration,
  kind: FactPhaseKind,
  now: number
): RawIv {
  const open = d.endTime == null;
  const endMs = open ? now : d.endTimeMs;
  return {
    startMs: d.startTimeMs,
    endMs,
    hasOpenEnd: open,
    taskId: tid,
    kind,
    statusName: d.statusName,
  };
}

export function buildRawIntervalsForTask(
  tid: string,
  list: StatusDuration[],
  swimlaneAssigneeRole: Developer['role'],
  task: Task | undefined,
  tasksMap: Map<string, Task>,
  now: number
): RawIv[] {
  const doneStatusKeys = doneFactStatusKeysFromTasks(tasksMap.values());
  const raw: RawIv[] = [];
  for (const d of list) {
    const kind =
      swimlaneAssigneeRole === 'tester'
        ? factPhaseKindForTesterSwimlane(d.statusKey, task, tasksMap, doneStatusKeys)
        : factPhaseKindForDeveloperSwimlane(d.statusKey, doneStatusKeys);
    if (!kind) continue;
    raw.push(rawIntervalFromStatusDuration(tid, d, kind, now));
  }
  return raw;
}

export function getTaskIdsOnSwimlaneRow(
  developerId: string,
  taskPositions: Map<string, TaskPosition>
): string[] {
  const ids: string[] = [];
  taskPositions.forEach((pos, taskId) => {
    if (pos.assignee === developerId) ids.push(taskId);
  });
  return ids;
}

function sortChangelogEntries(a: ChangelogEntry, b: ChangelogEntry): number {
  const ta = new Date(a.updatedAt).getTime();
  const tb = new Date(b.updatedAt).getTime();
  if (ta !== tb) return ta - tb;
  return (a.id || '').localeCompare(b.id || '');
}

function mergeChangelogEntriesUnion(a: ChangelogEntry[], b: ChangelogEntry[]): ChangelogEntry[] {
  if (b.length === 0) return [...a].sort(sortChangelogEntries);
  if (a.length === 0) return [...b].sort(sortChangelogEntries);
  const byId = new Map<string, ChangelogEntry>();
  for (const e of b) byId.set(e.id, e);
  for (const e of a) byId.set(e.id, e);
  return [...byId.values()].sort(sortChangelogEntries);
}

function sortIssueComments(x: IssueComment, y: IssueComment): number {
  return new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime() || x.id - y.id;
}

function mergeIssueCommentsUnion(a: IssueComment[], b: IssueComment[]): IssueComment[] {
  if (b.length === 0) return [...a].sort(sortIssueComments);
  if (a.length === 0) return [...b].sort(sortIssueComments);
  const m = new Map<number, IssueComment>();
  for (const c of b) m.set(c.id, c);
  for (const c of a) m.set(c.id, c);
  return [...m.values()].sort(sortIssueComments);
}

export function mergeIssueDataForSwimlaneFactTooltip(
  taskId: string,
  swimlaneAssigneeRole: Developer['role'],
  tasksMap: Map<string, Task>,
  changelogsByTaskId: Map<string, ChangelogEntry[]>,
  commentsByTaskId: Map<string, IssueComment[]>
): { changelog: ChangelogEntry[]; comments: IssueComment[] } {
  const directCl = changelogsByTaskId.get(taskId) ?? [];
  const directCm = commentsByTaskId.get(taskId) ?? [];
  if (swimlaneAssigneeRole !== 'tester') {
    return { changelog: directCl, comments: directCm };
  }
  const task = tasksMap.get(taskId);
  const devId = task?.originalTaskId;
  if (!devId) {
    return { changelog: directCl, comments: directCm };
  }
  const fromDevCl = changelogsByTaskId.get(devId) ?? [];
  const fromDevCm = commentsByTaskId.get(devId) ?? [];
  return {
    changelog: mergeChangelogEntriesUnion(directCl, fromDevCl),
    comments: mergeIssueCommentsUnion(directCm, fromDevCm),
  };
}
