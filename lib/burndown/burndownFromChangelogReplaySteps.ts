import type { BurndownDayChangelogItem } from '@/lib/api/types';
import type { YtrackerBurndownChangelogEntry, YtrackerBurndownIssue } from '@/lib/ytrackerRawIssues';

import {
  appendDailyChangelogFieldsForEntry,
  applyBurndownEventType,
  applyFieldToTaskState,
  changelogEntrySortKey,
  cloneTaskStateMap,
  enumerateSprintDays,
  extractStatusKey,
  isDoneStatus,
  parseChangelogEntryToEvents,
  resolveCurrentBurndownDateKey,
  sumRemainingOpenWork,
  toBurndownDateKey,
  type BurndownEvent,
  type TaskState,
} from './burndownFromChangelogReplayHelpers';

export interface BurndownDataPoint {
  date: string;
  dateKey: string;
  remainingSP: number;
  remainingTP: number;
}

function createTaskStateFromIssue(yt: YtrackerBurndownIssue): TaskState {
  return {
    inSprint: false,
    sp: yt.storyPoints ?? 0,
    tp: yt.testPoints ?? 0,
    isDone: isDoneStatus(extractStatusKey(yt.statusKey) ?? yt.statusKey),
  };
}

function applyPreSprintEntryFields(
  entry: YtrackerBurndownChangelogEntry,
  sprintName: string,
  sprintIdForMatch: string | undefined,
  state: TaskState,
): boolean {
  let hasSprintField = false;
  for (const field of entry.fields ?? []) {
    if (field?.field?.id === 'sprint') {
      hasSprintField = true;
    }
    applyFieldToTaskState(field, sprintName, sprintIdForMatch, state);
  }
  return hasSprintField;
}

function replayPreSprintChangelogFields(
  raw: YtrackerBurndownChangelogEntry[],
  sprintStartTime: number,
  sprintName: string,
  sprintIdForMatch: string | undefined,
  state: TaskState,
): boolean {
  let hasSprintField = false;
  for (const entry of raw) {
    const t = new Date(entry.updatedAt).getTime();
    if (t >= sprintStartTime) {
      break;
    }
    if (applyPreSprintEntryFields(entry, sprintName, sprintIdForMatch, state)) {
      hasSprintField = true;
    }
  }
  return hasSprintField;
}

export function buildTaskStateAtSprintStart(
  yt: YtrackerBurndownIssue,
  sprintName: string,
  sprintIdForMatch: string | undefined,
  sprintStartTime: number,
): TaskState {
  const state = createTaskStateFromIssue(yt);
  const hasSprintField = replayPreSprintChangelogFields(
    yt.rawChangelog ?? [],
    sprintStartTime,
    sprintName,
    sprintIdForMatch,
    state,
  );
  if (!hasSprintField) state.inSprint = true;
  return state;
}

function compareSequencedBurndownEvents(
  a: { entryId: string; ev: BurndownEvent; seq: number },
  b: { entryId: string; ev: BurndownEvent; seq: number },
): number {
  const ta = new Date(a.ev.date).getTime();
  const tb = new Date(b.ev.date).getTime();
  if (ta !== tb) return ta - tb;
  if (a.entryId !== b.entryId) return a.entryId.localeCompare(b.entryId);
  if (a.ev.issueKey !== b.ev.issueKey) return a.ev.issueKey.localeCompare(b.ev.issueKey);
  return a.seq - b.seq;
}

function isEntryInSprintWindow(entryTime: number, sprintStartTime: number, sprintEndTime: number): boolean {
  return entryTime >= sprintStartTime && entryTime <= sprintEndTime;
}

function appendSprintWindowEventsForIssue(
  yt: YtrackerBurndownIssue,
  sprintName: string,
  sprintIdForMatch: string | undefined,
  sprintStartTime: number,
  sprintEndTime: number,
  withSeq: { entryId: string; ev: BurndownEvent; seq: number }[],
  seqRef: { value: number },
): void {
  for (const entry of yt.rawChangelog ?? []) {
    const entryTime = new Date(entry.updatedAt).getTime();
    if (!isEntryInSprintWindow(entryTime, sprintStartTime, sprintEndTime)) {
      continue;
    }
    const entryId = changelogEntrySortKey(entry);
    for (const ev of parseChangelogEntryToEvents(entry, yt.issueKey, sprintName, sprintIdForMatch)) {
      withSeq.push({ ev, seq: seqRef.value++, entryId });
    }
  }
}

function collectSequencedBurndownEvents(
  ytrackerIssues: YtrackerBurndownIssue[],
  sprintName: string,
  sprintIdForMatch: string | undefined,
  sprintStartTime: number,
  sprintEndTime: number,
): { entryId: string; ev: BurndownEvent; seq: number }[] {
  const withSeq: { entryId: string; ev: BurndownEvent; seq: number }[] = [];
  const seqRef = { value: 0 };
  for (const yt of ytrackerIssues) {
    appendSprintWindowEventsForIssue(
      yt,
      sprintName,
      sprintIdForMatch,
      sprintStartTime,
      sprintEndTime,
      withSeq,
      seqRef,
    );
  }
  return withSeq;
}

export function collectBurndownEventsInSprintWindow(
  ytrackerIssues: YtrackerBurndownIssue[],
  sprintName: string,
  sprintIdForMatch: string | undefined,
  sprintStartTime: number,
  sprintEndTime: number,
): BurndownEvent[] {
  const withSeq = collectSequencedBurndownEvents(
    ytrackerIssues,
    sprintName,
    sprintIdForMatch,
    sprintStartTime,
    sprintEndTime,
  );
  withSeq.sort(compareSequencedBurndownEvents);
  return withSeq.map((x) => x.ev);
}

interface SprintWindowChangelogRow {
  entry: YtrackerBurndownChangelogEntry;
  entryId: string;
  issueKey: string;
  timeMs: number;
}

function compareSprintWindowChangelogRows(a: SprintWindowChangelogRow, b: SprintWindowChangelogRow): number {
  if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
  if (a.entryId !== b.entryId) return a.entryId.localeCompare(b.entryId);
  return a.issueKey.localeCompare(b.issueKey);
}

function appendSprintWindowRowsForIssue(
  yt: YtrackerBurndownIssue,
  sprintStartTime: number,
  sprintEndTime: number,
  rows: SprintWindowChangelogRow[],
): void {
  for (const entry of yt.rawChangelog ?? []) {
    const t = new Date(entry.updatedAt).getTime();
    if (!isEntryInSprintWindow(t, sprintStartTime, sprintEndTime)) {
      continue;
    }
    rows.push({
      entry,
      issueKey: yt.issueKey,
      timeMs: t,
      entryId: changelogEntrySortKey(entry),
    });
  }
}

function collectSprintWindowChangelogRows(
  ytrackerIssues: YtrackerBurndownIssue[],
  sprintStartTime: number,
  sprintEndTime: number,
): SprintWindowChangelogRow[] {
  const rows: SprintWindowChangelogRow[] = [];
  for (const yt of ytrackerIssues) {
    appendSprintWindowRowsForIssue(yt, sprintStartTime, sprintEndTime, rows);
  }
  return rows;
}

function buildDailyChangelogFromFieldStream(
  ytrackerIssues: YtrackerBurndownIssue[],
  taskStateAtStart: Map<string, TaskState>,
  sprintName: string,
  sprintIdForMatch: string | undefined,
  sprintStartTime: number,
  sprintEndTime: number,
  issueSummaries: Map<string, string>,
): Record<string, BurndownDayChangelogItem[]> {
  const taskState = cloneTaskStateMap(taskStateAtStart);
  const dailyChangelog: Record<string, BurndownDayChangelogItem[]> = {};
  const rows = collectSprintWindowChangelogRows(ytrackerIssues, sprintStartTime, sprintEndTime);
  rows.sort(compareSprintWindowChangelogRows);

  for (const { entry, issueKey } of rows) {
    const summary = issueSummaries.get(issueKey) ?? issueKey;
    appendDailyChangelogFieldsForEntry(
      entry,
      issueKey,
      summary,
      taskState,
      dailyChangelog,
      sprintName,
      sprintIdForMatch,
    );
  }

  return dailyChangelog;
}

function buildTaskStateMapAtStart(
  ytrackerIssues: YtrackerBurndownIssue[],
  sprintName: string,
  sprintIdForMatch: string | undefined,
  sprintStartTime: number,
): Map<string, TaskState> {
  const taskStateAtStart = new Map<string, TaskState>();
  for (const yt of ytrackerIssues) {
    taskStateAtStart.set(
      yt.issueKey,
      buildTaskStateAtSprintStart(yt, sprintName, sprintIdForMatch, sprintStartTime),
    );
  }
  return taskStateAtStart;
}

function sumInitialOpenPoints(taskStateAtStart: Map<string, TaskState>): { initialSP: number; initialTP: number } {
  let initialSP = 0;
  let initialTP = 0;
  for (const s of taskStateAtStart.values()) {
    if (s.inSprint && !s.isDone) {
      initialSP += s.sp;
      initialTP += s.tp;
    }
  }
  return { initialSP, initialTP };
}

function groupBurndownEventsByDay(events: BurndownEvent[]): Map<string, BurndownEvent[]> {
  const eventsByDay = new Map<string, BurndownEvent[]>();
  for (const ev of events) {
    const dk = toBurndownDateKey(new Date(ev.date));
    const list = eventsByDay.get(dk) ?? [];
    list.push(ev);
    eventsByDay.set(dk, list);
  }
  return eventsByDay;
}

function applyDayBurndownEvents(taskState: Map<string, TaskState>, dayEvents: BurndownEvent[]): void {
  for (const ev of dayEvents) {
    const state = taskState.get(ev.issueKey);
    if (!state) continue;
    applyBurndownEventType(ev, state);
  }
}

function buildBurndownDataPoint(dateKey: string, taskState: Map<string, TaskState>): BurndownDataPoint {
  const atEndOfDay = sumRemainingOpenWork(taskState);
  const d = new Date(`${dateKey}T12:00:00`);
  return {
    dateKey,
    date: new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString(),
    remainingSP: Math.max(0, atEndOfDay.remainingSP),
    remainingTP: Math.max(0, atEndOfDay.remainingTP),
  };
}

function buildBurndownDataPoints(
  dayKeys: string[],
  eventsByDay: Map<string, BurndownEvent[]>,
  taskStateAtStart: Map<string, TaskState>,
): BurndownDataPoint[] {
  const taskState = cloneTaskStateMap(taskStateAtStart);
  const dataPoints: BurndownDataPoint[] = [];

  for (const dateKey of dayKeys) {
    applyDayBurndownEvents(taskState, eventsByDay.get(dateKey) ?? []);
    dataPoints.push(buildBurndownDataPoint(dateKey, taskState));
  }

  return dataPoints;
}

interface ComputeBurndownFromChangelogInput {
  issueSummaries: Map<string, string>;
  sprintEndDate: Date;
  sprintEndTime: number;
  sprintIdForMatch: string | undefined;
  sprintName: string;
  sprintStartDate: Date;
  sprintStartTime: number;
  ytrackerIssues: YtrackerBurndownIssue[];
}

interface ComputeBurndownFromChangelogResult {
  currentSP: number;
  currentTP: number;
  dailyChangelog: Record<string, BurndownDayChangelogItem[]>;
  dataPoints: BurndownDataPoint[];
  initialSP: number;
  initialTP: number;
}

export function computeBurndownFromChangelog(
  input: ComputeBurndownFromChangelogInput,
): ComputeBurndownFromChangelogResult {
  const {
    ytrackerIssues,
    sprintName,
    sprintIdForMatch,
    sprintStartTime,
    sprintEndTime,
    sprintStartDate,
    sprintEndDate,
    issueSummaries,
  } = input;

  const taskStateAtStart = buildTaskStateMapAtStart(
    ytrackerIssues,
    sprintName,
    sprintIdForMatch,
    sprintStartTime,
  );
  const { initialSP, initialTP } = sumInitialOpenPoints(taskStateAtStart);

  const events = collectBurndownEventsInSprintWindow(
    ytrackerIssues,
    sprintName,
    sprintIdForMatch,
    sprintStartTime,
    sprintEndTime,
  );
  const eventsByDay = groupBurndownEventsByDay(events);

  const dailyChangelog = buildDailyChangelogFromFieldStream(
    ytrackerIssues,
    taskStateAtStart,
    sprintName,
    sprintIdForMatch,
    sprintStartTime,
    sprintEndTime,
    issueSummaries,
  );

  const dayKeys = enumerateSprintDays(sprintStartDate, sprintEndDate);
  const dataPoints = buildBurndownDataPoints(dayKeys, eventsByDay, taskStateAtStart);

  const keyForCurrent = resolveCurrentBurndownDateKey(dayKeys);
  const currentPoint =
    dataPoints.find((p) => p.dateKey === keyForCurrent) ?? dataPoints[dataPoints.length - 1];

  return {
    initialSP,
    initialTP,
    dailyChangelog,
    dataPoints,
    currentSP: currentPoint?.remainingSP ?? 0,
    currentTP: currentPoint?.remainingTP ?? 0,
  };
}
