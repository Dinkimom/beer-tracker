import type {
  BuildTaskChangelogTimelineOptions,
  ComputeSprintTimelineTotalsOptions,
  SprintTimelineTotals,
  TaskChangelogTimelineItem,
} from './taskChangelogTimelineTypes';
import type { YtrackerBurndownChangelogEntry, YtrackerBurndownIssue } from '@/lib/ytrackerRawIssues';

import { mapStatus } from '@/utils/statusMapper';

import {
  applyBurndownEvent,
  buildTaskStateAtSprintStart,
  type BurndownEvent,
  extractStatusKey,
  toBurndownDateKey,
  type TaskState,
} from './burndownFromChangelogReplay';
import { sprintArrayContainsSprint } from './sprintMembership';
import {
  pushConsolidatedReestimateIfFirst,
  pushConsolidatedStatusIfFirst,
} from './taskChangelogTimelineRollupHelpers';

interface ChangelogRow {
  dateKey: string;
  entryId: string;
  issueKey: string;
  items: TaskChangelogTimelineItem[];
  timeMs: number;
}

function isDoneStatusKey(statusKey: string | undefined): boolean {
  if (!statusKey) return false;
  return mapStatus(statusKey.toLowerCase()) === 'done';
}

function timelineItemToBurndownEvent(item: TaskChangelogTimelineItem): BurndownEvent | null {
  switch (item.type) {
    case 'sprint_added':
      return { type: 'added', date: '', issueKey: item.issueKey };
    case 'sprint_removed':
      return { type: 'removed', date: '', issueKey: item.issueKey };
    case 'reestimated':
      return {
        type: 'reestimated',
        date: '',
        issueKey: item.issueKey,
        deltaSP: item.deltaSP,
        deltaTP: item.deltaTP,
      };
    case 'status_change':
      return timelineStatusChangeToBurndownEvent(item);
    default:
      return null;
  }
}

function timelineStatusChangeToBurndownEvent(
  item: Extract<TaskChangelogTimelineItem, { type: 'status_change' }>
): BurndownEvent | null {
  if (!isDoneStatusKey(item.toKey)) return null;
  if (item.fromKey && isDoneStatusKey(item.fromKey)) return null;
  return { type: 'closed', date: '', issueKey: item.issueKey };
}

function sumSprintTotalsFromTaskStates(taskState: Map<string, TaskState>): SprintTimelineTotals {
  let totalSP = 0;
  let totalTP = 0;
  let doneSP = 0;
  let doneTP = 0;

  for (const s of taskState.values()) {
    if (!s.inSprint) continue;
    totalSP += s.sp;
    totalTP += s.tp;
    if (s.isDone) {
      doneSP += s.sp;
      doneTP += s.tp;
    }
  }

  return {
    totalSP,
    totalTP,
    doneSP,
    doneTP,
    remainingSP: totalSP - doneSP,
    remainingTP: totalTP - doneTP,
  };
}

function changelogEntrySortKeyForMerge(entry: YtrackerBurndownChangelogEntry): string {
  return entry.id ?? entry.updatedAt;
}

function compareTimelineRows(a: ChangelogRow, b: ChangelogRow): number {
  if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
  if (a.issueKey !== b.issueKey) return a.issueKey.localeCompare(b.issueKey);
  return a.entryId.localeCompare(b.entryId);
}

function entryTimeMs(entry: YtrackerBurndownChangelogEntry): number {
  return new Date(entry.updatedAt).getTime();
}

function sortKeyEntry(
  a: YtrackerBurndownChangelogEntry,
  b: YtrackerBurndownChangelogEntry
): number {
  const ta = entryTimeMs(a);
  const tb = entryTimeMs(b);
  if (ta !== tb) return ta - tb;
  const ida = a.id ?? a.updatedAt;
  const idb = b.id ?? b.updatedAt;
  return ida.localeCompare(idb);
}

function parseStatusFieldToItem(
  field: NonNullable<YtrackerBurndownChangelogEntry['fields']>[number],
  issueKey: string
): TaskChangelogTimelineItem {
  const fromKey = extractStatusKey(field.from);
  const toKey = extractStatusKey(field.to);
  return { type: 'status_change', issueKey, fromKey, toKey };
}

function parsePointsDelta(
  field: NonNullable<YtrackerBurndownChangelogEntry['fields']>[number]
): { deltaSP: number; deltaTP: number } {
  const fieldId = field?.field?.id;
  const from = (field.from as number | null | undefined) ?? 0;
  const to = (field.to as number | null | undefined) ?? 0;
  const delta = to - from;
  if (fieldId === 'storyPoints' || fieldId === 'story_points') {
    return { deltaSP: delta, deltaTP: 0 };
  }
  return { deltaSP: 0, deltaTP: delta };
}

function parseSprintFieldToItems(
  field: NonNullable<YtrackerBurndownChangelogEntry['fields']>[number],
  issueKey: string,
  sprintName: string,
  sprintId: string | undefined
): TaskChangelogTimelineItem[] {
  const items: TaskChangelogTimelineItem[] = [];
  const toHas = sprintArrayContainsSprint(field.to, sprintName, sprintId);
  const fromHad = sprintArrayContainsSprint(field.from, sprintName, sprintId);
  if (toHas && !fromHad) items.push({ type: 'sprint_added', issueKey });
  if (fromHad && !toHas) items.push({ type: 'sprint_removed', issueKey });
  return items;
}

function parseChangelogFieldToItems(
  field: NonNullable<YtrackerBurndownChangelogEntry['fields']>[number],
  issueKey: string,
  sprintName: string,
  sprintId: string | undefined,
  pointsAcc: { deltaSP: number; deltaTP: number }
): TaskChangelogTimelineItem[] {
  const fieldId = field?.field?.id;
  if (!fieldId) return [];

  if (fieldId === 'status') {
    return [parseStatusFieldToItem(field, issueKey)];
  }
  if (fieldId === 'storyPoints' || fieldId === 'story_points') {
    const { deltaSP } = parsePointsDelta(field);
    pointsAcc.deltaSP += deltaSP;
    return [];
  }
  if (fieldId === 'testPoints' || fieldId === 'test_points') {
    const { deltaTP } = parsePointsDelta(field);
    pointsAcc.deltaTP += deltaTP;
    return [];
  }
  if (fieldId === 'sprint') {
    return parseSprintFieldToItems(field, issueKey, sprintName, sprintId);
  }
  return [];
}

export function parseChangelogEntryToTimelineItems(
  entry: YtrackerBurndownChangelogEntry,
  issueKey: string,
  sprintName: string,
  sprintId: string | undefined
): TaskChangelogTimelineItem[] {
  const items: TaskChangelogTimelineItem[] = [];
  const fields = entry.fields ?? [];
  const pointsAcc = { deltaSP: 0, deltaTP: 0 };

  for (const field of fields) {
    items.push(
      ...parseChangelogFieldToItems(field, issueKey, sprintName, sprintId, pointsAcc)
    );
  }

  if (pointsAcc.deltaSP !== 0 || pointsAcc.deltaTP !== 0) {
    items.push({
      type: 'reestimated',
      issueKey,
      deltaSP: pointsAcc.deltaSP,
      deltaTP: pointsAcc.deltaTP,
    });
  }

  return items;
}

interface DayTaskAcc {
  events: TaskChangelogTimelineItem[];
  firstMs: number;
}

function upsertDayTaskAcc(
  taskMap: Map<string, DayTaskAcc>,
  issueKey: string,
  row: ChangelogRow
): void {
  const prev = taskMap.get(issueKey);
  if (!prev) {
    taskMap.set(issueKey, {
      firstMs: row.timeMs,
      events: [...row.items],
    });
    return;
  }
  prev.firstMs = Math.min(prev.firstMs, row.timeMs);
  prev.events.push(...row.items);
}

export function groupChangelogRowsIntoTaskDays(rows: ChangelogRow[]) {
  const dayOrder: string[] = [];
  const seenDay = new Set<string>();
  const byDay = new Map<string, Map<string, DayTaskAcc>>();

  for (const row of rows) {
    if (!seenDay.has(row.dateKey)) {
      seenDay.add(row.dateKey);
      dayOrder.push(row.dateKey);
    }
    let taskMap = byDay.get(row.dateKey);
    if (!taskMap) {
      taskMap = new Map();
      byDay.set(row.dateKey, taskMap);
    }
    upsertDayTaskAcc(taskMap, row.issueKey, row);
  }

  return dayOrder.map((dateKey) => {
    const taskMap = byDay.get(dateKey)!;
    const tasks = [...taskMap.entries()]
      .map(([issueKey, acc]) => ({
        issueKey,
        firstMs: acc.firstMs,
        events: acc.events,
      }))
      .sort((a, b) => a.firstMs - b.firstMs || a.issueKey.localeCompare(b.issueKey))
      .map(({ issueKey, events }) => ({ issueKey, events }));
    return { dateKey, tasks };
  });
}

function collectReestimateNet(events: TaskChangelogTimelineItem[]): {
  firstReestimateIndex: number;
  issueKey: string;
  netSP: number;
  netTP: number;
} {
  let netSP = 0;
  let netTP = 0;
  let firstReestimateIndex = -1;
  const issueKey = events[0]?.issueKey ?? '';

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.type !== 'reestimated') continue;
    if (firstReestimateIndex < 0) firstReestimateIndex = i;
    netSP += e.deltaSP;
    netTP += e.deltaTP;
  }

  return { netSP, netTP, firstReestimateIndex, issueKey };
}

export function rollupTaskDayReestimatesToOne(
  events: TaskChangelogTimelineItem[]
): TaskChangelogTimelineItem[] {
  const { netSP, netTP, firstReestimateIndex, issueKey } = collectReestimateNet(events);

  const out: TaskChangelogTimelineItem[] = [];
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.type === 'reestimated') {
      pushConsolidatedReestimateIfFirst(out, i, firstReestimateIndex, issueKey, netSP, netTP);
      continue;
    }
    out.push(e);
  }
  return out;
}

function rollupTaskDayStatusChainToOne(
  events: TaskChangelogTimelineItem[]
): TaskChangelogTimelineItem[] {
  const statuses = events.filter(
    (e): e is Extract<TaskChangelogTimelineItem, { type: 'status_change' }> =>
      e.type === 'status_change'
  );
  if (statuses.length <= 1) return events;

  const issueKey = statuses[0].issueKey;
  const fromKey = statuses[0].fromKey;
  const toKey = statuses[statuses.length - 1].toKey;

  const out: TaskChangelogTimelineItem[] = [];
  let inserted = false;
  for (const e of events) {
    if (e.type === 'status_change') {
      inserted =
        inserted ||
        pushConsolidatedStatusIfFirst(out, inserted, issueKey, fromKey ?? '', toKey ?? '');
      continue;
    }
    out.push(e);
  }
  return out;
}

export function rollupTaskDayEventsForEndOfDayView(
  events: TaskChangelogTimelineItem[]
): TaskChangelogTimelineItem[] {
  return rollupTaskDayStatusChainToOne(rollupTaskDayReestimatesToOne(events));
}

export function computeSprintTimelineTotalsFromRows(
  issues: YtrackerBurndownIssue[],
  options: ComputeSprintTimelineTotalsOptions,
  rows: ChangelogRow[]
): SprintTimelineTotals {
  const { sprintName, sprintId, sprintStartTime } = options;

  const taskState = new Map<string, TaskState>();
  for (const yt of issues) {
    taskState.set(yt.issueKey, buildTaskStateAtSprintStart(yt, sprintName, sprintId, sprintStartTime));
  }

  for (const row of rows) {
    applyTimelineRowToTaskState(row, taskState);
  }

  return sumSprintTotalsFromTaskStates(taskState);
}

function applyTimelineRowToTaskState(
  row: ChangelogRow,
  taskState: Map<string, TaskState>
): void {
  for (const item of row.items) {
    const ev = timelineItemToBurndownEvent(item);
    if (!ev) continue;
    const state = taskState.get(ev.issueKey);
    if (!state) continue;
    applyBurndownEvent(ev, state);
  }
}

function isChangelogEntryInWindow(
  entry: YtrackerBurndownChangelogEntry,
  windowStartMs: number | undefined,
  windowEndMs: number | undefined
): boolean {
  const t = entryTimeMs(entry);
  if (windowStartMs != null && t < windowStartMs) return false;
  if (windowEndMs != null && t > windowEndMs) return false;
  return true;
}

function collectChangelogRowsForIssue(
  issue: YtrackerBurndownIssue,
  options: BuildTaskChangelogTimelineOptions
): ChangelogRow[] {
  const { sprintName, sprintId, windowStartMs, windowEndMs } = options;
  const rows: ChangelogRow[] = [];
  const raw = [...(issue.rawChangelog ?? [])].sort(sortKeyEntry);

  for (const entry of raw) {
    if (!isChangelogEntryInWindow(entry, windowStartMs, windowEndMs)) continue;

    const items = parseChangelogEntryToTimelineItems(entry, issue.issueKey, sprintName, sprintId);
    if (items.length === 0) continue;

    rows.push({
      dateKey: toBurndownDateKey(new Date(entry.updatedAt)),
      timeMs: entryTimeMs(entry),
      issueKey: issue.issueKey,
      entryId: changelogEntrySortKeyForMerge(entry),
      items,
    });
  }

  return rows;
}

export function collectSprintChangelogRows(
  issues: YtrackerBurndownIssue[],
  options: BuildTaskChangelogTimelineOptions
): ChangelogRow[] {
  const rows = issues.flatMap((issue) => collectChangelogRowsForIssue(issue, options));
  rows.sort(compareTimelineRows);
  return rows;
}
