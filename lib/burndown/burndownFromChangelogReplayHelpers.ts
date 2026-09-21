import type { BurndownDayChangelogItem } from '@/lib/api/types';
import type { YtrackerBurndownChangelogEntry } from '@/lib/ytrackerRawIssues';

import { extractStatusKeyFromValue } from '@/lib/burndown/extractStatusKeyHelpers';
import { sprintArrayContainsSprint } from '@/lib/burndown/sprintMembership';
import { mapStatus } from '@/utils/statusMapper';

export function toBurndownDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isDoneStatus(statusKey: string | undefined): boolean {
  if (!statusKey) return false;
  return mapStatus(statusKey.toLowerCase()) === 'done';
}

export function extractStatusKey(value: unknown): string | undefined {
  return extractStatusKeyFromValue(value);
}

export interface TaskState {
  inSprint: boolean;
  isDone: boolean;
  sp: number;
  tp: number;
}

export type BurndownEvent =
  | { type: 'added'; date: string; issueKey: string }
  | { type: 'closed'; date: string; issueKey: string }
  | { type: 'reestimated'; date: string; issueKey: string; deltaSP: number; deltaTP: number }
  | { type: 'removed'; date: string; issueKey: string };

export function applyFieldToTaskState(
  field: BurndownChangelogField | undefined,
  sprintName: string,
  sprintIdForMatch: string | undefined,
  state: TaskState,
): void {
  if (!field?.field?.id) return;
  const fid = field.field.id;

  if (fid === 'status') {
    applyStatusFieldToTaskState(field, state);
    return;
  }
  if (fid === 'storyPoints' || fid === 'story_points') {
    applyStoryPointsFieldToTaskState(field, state);
    return;
  }
  if (fid === 'testPoints' || fid === 'test_points') {
    applyTestPointsFieldToTaskState(field, state);
    return;
  }
  if (fid === 'sprint') {
    applySprintFieldToTaskState(field, sprintName, sprintIdForMatch, state);
  }
}

function applyStatusFieldToTaskState(
  field: BurndownChangelogField,
  state: TaskState
): void {
  const toKey = extractStatusKey(field.to);
  if (toKey) state.isDone = isDoneStatus(toKey);
}

function applyStoryPointsFieldToTaskState(
  field: BurndownChangelogField,
  state: TaskState
): void {
  const v = field.to as number | null | undefined;
  if (typeof v === 'number') state.sp = v;
}

function applyTestPointsFieldToTaskState(
  field: BurndownChangelogField,
  state: TaskState
): void {
  const v = field.to as number | null | undefined;
  if (typeof v === 'number') state.tp = v;
}

function applySprintFieldToTaskState(
  field: BurndownChangelogField,
  sprintName: string,
  sprintIdForMatch: string | undefined,
  state: TaskState
): void {
  const toHas = sprintArrayContainsSprint(field.to, sprintName, sprintIdForMatch);
  const fromHad = sprintArrayContainsSprint(field.from, sprintName, sprintIdForMatch);
  if (toHas && !fromHad) state.inSprint = true;
  if (fromHad && !toHas) state.inSprint = false;
}

type BurndownChangelogField = NonNullable<YtrackerBurndownChangelogEntry['fields']>[number];

export function changelogEntrySortKey(entry: YtrackerBurndownChangelogEntry): string {
  return entry.id ?? entry.updatedAt;
}

function applyStatusFieldToEvents(
  field: BurndownChangelogField,
  events: BurndownEvent[],
  date: string,
  issueKey: string,
): void {
  const fromKey = extractStatusKey(field.from);
  const toKey = extractStatusKey(field.to);
  if (toKey && isDoneStatus(toKey) && (!fromKey || !isDoneStatus(fromKey))) {
    events.push({ type: 'closed', date, issueKey });
  }
}

function applyPointsFieldToDeltas(
  field: BurndownChangelogField,
  fieldId: string,
  deltas: { deltaSP: number; deltaTP: number },
): void {
  const from = (field.from as number | null | undefined) ?? 0;
  const to = (field.to as number | null | undefined) ?? 0;
  if (fieldId === 'storyPoints' || fieldId === 'story_points') {
    deltas.deltaSP += to - from;
    return;
  }
  deltas.deltaTP += to - from;
}

function applySprintFieldToEvents(
  field: BurndownChangelogField,
  events: BurndownEvent[],
  date: string,
  issueKey: string,
  sprintName: string,
  sprintId?: string,
): void {
  const toHas = sprintArrayContainsSprint(field.to, sprintName, sprintId);
  const fromHad = sprintArrayContainsSprint(field.from, sprintName, sprintId);
  if (toHas && !fromHad) events.push({ type: 'added', date, issueKey });
  if (fromHad && !toHas) events.push({ type: 'removed', date, issueKey });
}

function processChangelogFieldToEvents(
  field: BurndownChangelogField,
  events: BurndownEvent[],
  date: string,
  issueKey: string,
  sprintName: string,
  sprintId: string | undefined,
  deltas: { deltaSP: number; deltaTP: number }
): void {
  const fieldId = field?.field?.id;
  if (!fieldId) return;

  if (fieldId === 'status') {
    applyStatusFieldToEvents(field, events, date, issueKey);
    return;
  }
  if (fieldId === 'storyPoints' || fieldId === 'story_points' || fieldId === 'testPoints' || fieldId === 'test_points') {
    applyPointsFieldToDeltas(field, fieldId, deltas);
    return;
  }
  if (fieldId === 'sprint') {
    applySprintFieldToEvents(field, events, date, issueKey, sprintName, sprintId);
  }
}

export function parseChangelogEntryToEvents(
  entry: YtrackerBurndownChangelogEntry,
  issueKey: string,
  sprintName: string,
  sprintId?: string,
): BurndownEvent[] {
  const events: BurndownEvent[] = [];
  const date = entry.updatedAt;
  const deltas = { deltaSP: 0, deltaTP: 0 };

  for (const field of entry.fields ?? []) {
    processChangelogFieldToEvents(field, events, date, issueKey, sprintName, sprintId, deltas);
  }

  if (deltas.deltaSP !== 0 || deltas.deltaTP !== 0) {
    events.push({ type: 'reestimated', date, issueKey, deltaSP: deltas.deltaSP, deltaTP: deltas.deltaTP });
  }

  return events;
}

export function cloneTaskStateMap(map: Map<string, TaskState>): Map<string, TaskState> {
  const next = new Map<string, TaskState>();
  for (const [k, v] of map) next.set(k, { ...v });
  return next;
}

function appendDailyChangelogItem(
  dailyChangelog: Record<string, BurndownDayChangelogItem[]>,
  dateKey: string,
  item: BurndownDayChangelogItem,
): void {
  const list = dailyChangelog[dateKey] ?? [];
  list.push(item);
  dailyChangelog[dateKey] = list;
}

export function sumRemainingOpenWork(
  taskState: Map<string, TaskState>,
): { remainingSP: number; remainingTP: number } {
  let remainingSP = 0;
  let remainingTP = 0;
  for (const s of taskState.values()) {
    if (s.inSprint && !s.isDone) {
      remainingSP += s.sp;
      remainingTP += s.tp;
    }
  }
  return { remainingSP, remainingTP };
}

interface DailyChangelogFieldContext {
  dailyChangelog: Record<string, BurndownDayChangelogItem[]>;
  dateKey: string;
  issueKey: string;
  sprintIdForMatch: string | undefined;
  sprintName: string;
  state: TaskState;
  summary: string;
  taskState: Map<string, TaskState>;
}

function appendPointsChangeToDailyChangelog(
  field: BurndownChangelogField,
  ctx: DailyChangelogFieldContext,
  type: 'story_points_change' | 'test_points_change',
  changeSp: number,
  changeTp: number,
): void {
  const from = (field.from as number | null | undefined) ?? 0;
  const to = (field.to as number | null | undefined) ?? 0;
  applyFieldToTaskState(field, ctx.sprintName, ctx.sprintIdForMatch, ctx.state);
  const { remainingSP, remainingTP } = sumRemainingOpenWork(ctx.taskState);
  appendDailyChangelogItem(ctx.dailyChangelog, ctx.dateKey, {
    type,
    issueKey: ctx.issueKey,
    summary: ctx.summary,
    change: changeSp,
    changeTP: changeTp,
    remainingSP,
    remainingTP,
    pointsFrom: from,
    pointsTo: to,
  });
}

function appendStoryPointsFieldToDailyChangelog(
  field: BurndownChangelogField,
  ctx: DailyChangelogFieldContext,
): void {
  const from = (field.from as number | null | undefined) ?? 0;
  const to = (field.to as number | null | undefined) ?? 0;
  appendPointsChangeToDailyChangelog(field, ctx, 'story_points_change', to - from, 0);
}

function appendTestPointsFieldToDailyChangelog(
  field: BurndownChangelogField,
  ctx: DailyChangelogFieldContext,
): void {
  const from = (field.from as number | null | undefined) ?? 0;
  const to = (field.to as number | null | undefined) ?? 0;
  appendPointsChangeToDailyChangelog(field, ctx, 'test_points_change', 0, to - from);
}

function remainingPointDeltas(
  before: { remainingSP: number; remainingTP: number },
  after: { remainingSP: number; remainingTP: number },
): { change: number; changeTP: number } {
  return {
    change: after.remainingSP - before.remainingSP,
    changeTP: after.remainingTP - before.remainingTP,
  };
}

function appendStatusFieldToDailyChangelog(
  field: BurndownChangelogField,
  ctx: DailyChangelogFieldContext,
): void {
  const fromKey = extractStatusKey(field.from);
  const toKey = extractStatusKey(field.to);
  const spBefore = ctx.state.sp;
  const tpBefore = ctx.state.tp;
  const before = sumRemainingOpenWork(ctx.taskState);
  applyFieldToTaskState(field, ctx.sprintName, ctx.sprintIdForMatch, ctx.state);
  const after = sumRemainingOpenWork(ctx.taskState);
  let { change, changeTP } = remainingPointDeltas(before, after);
  if (
    change === 0 &&
    changeTP === 0 &&
    isDoneStatus(toKey) &&
    !isDoneStatus(fromKey)
  ) {
    change = 0 - spBefore;
    changeTP = 0 - tpBefore;
  }
  appendDailyChangelogItem(ctx.dailyChangelog, ctx.dateKey, {
    type: 'status_change',
    issueKey: ctx.issueKey,
    summary: ctx.summary,
    change,
    changeTP,
    remainingSP: after.remainingSP,
    remainingTP: after.remainingTP,
    statusFromKey: fromKey,
    statusToKey: toKey,
  });
}

function appendSprintAddedToDailyChangelog(
  field: BurndownChangelogField,
  ctx: DailyChangelogFieldContext,
  wasInSprint: boolean,
  spBefore: number,
  tpBefore: number,
): void {
  applyFieldToTaskState(field, ctx.sprintName, ctx.sprintIdForMatch, ctx.state);
  const { remainingSP, remainingTP } = sumRemainingOpenWork(ctx.taskState);
  appendDailyChangelogItem(ctx.dailyChangelog, ctx.dateKey, {
    type: 'added',
    issueKey: ctx.issueKey,
    summary: ctx.summary,
    change: wasInSprint ? 0 : spBefore,
    changeTP: wasInSprint ? 0 : tpBefore,
    remainingSP,
    remainingTP,
  });
}

function appendSprintRemovedToDailyChangelog(
  field: BurndownChangelogField,
  ctx: DailyChangelogFieldContext,
  wasInSprint: boolean,
  spBefore: number,
  tpBefore: number,
): void {
  const changeSp = wasInSprint ? 0 - spBefore : 0;
  const changeTp = wasInSprint ? 0 - tpBefore : 0;
  applyFieldToTaskState(field, ctx.sprintName, ctx.sprintIdForMatch, ctx.state);
  const { remainingSP, remainingTP } = sumRemainingOpenWork(ctx.taskState);
  appendDailyChangelogItem(ctx.dailyChangelog, ctx.dateKey, {
    type: 'removed',
    issueKey: ctx.issueKey,
    summary: ctx.summary,
    change: changeSp,
    changeTP: changeTp,
    remainingSP,
    remainingTP,
  });
}

function appendSprintFieldChangeToDailyChangelog(
  field: BurndownChangelogField,
  ctx: DailyChangelogFieldContext,
): void {
  applyFieldToTaskState(field, ctx.sprintName, ctx.sprintIdForMatch, ctx.state);
  const { remainingSP, remainingTP } = sumRemainingOpenWork(ctx.taskState);
  appendDailyChangelogItem(ctx.dailyChangelog, ctx.dateKey, {
    type: 'sprint_field_change',
    issueKey: ctx.issueKey,
    summary: ctx.summary,
    change: 0,
    changeTP: 0,
    remainingSP,
    remainingTP,
  });
}

function appendSprintFieldToDailyChangelog(
  field: BurndownChangelogField,
  ctx: DailyChangelogFieldContext,
): void {
  const toHas = sprintArrayContainsSprint(field.to, ctx.sprintName, ctx.sprintIdForMatch);
  const fromHad = sprintArrayContainsSprint(field.from, ctx.sprintName, ctx.sprintIdForMatch);
  const wasInSprint = ctx.state.inSprint;
  const spBefore = ctx.state.sp;
  const tpBefore = ctx.state.tp;

  if (toHas && !fromHad) {
    appendSprintAddedToDailyChangelog(field, ctx, wasInSprint, spBefore, tpBefore);
    return;
  }
  if (fromHad && !toHas) {
    appendSprintRemovedToDailyChangelog(field, ctx, wasInSprint, spBefore, tpBefore);
    return;
  }
  appendSprintFieldChangeToDailyChangelog(field, ctx);
}

function appendDailyChangelogField(
  field: BurndownChangelogField,
  fieldCtx: DailyChangelogFieldContext,
): void {
  const fieldId = field?.field?.id;
  if (!fieldId) return;

  if (fieldId === 'storyPoints' || fieldId === 'story_points') {
    appendStoryPointsFieldToDailyChangelog(field, fieldCtx);
    return;
  }
  if (fieldId === 'testPoints' || fieldId === 'test_points') {
    appendTestPointsFieldToDailyChangelog(field, fieldCtx);
    return;
  }
  if (fieldId === 'status') {
    appendStatusFieldToDailyChangelog(field, fieldCtx);
    return;
  }
  if (fieldId === 'sprint') {
    appendSprintFieldToDailyChangelog(field, fieldCtx);
  }
}

export function appendDailyChangelogFieldsForEntry(
  entry: YtrackerBurndownChangelogEntry,
  issueKey: string,
  summary: string,
  taskState: Map<string, TaskState>,
  dailyChangelog: Record<string, BurndownDayChangelogItem[]>,
  sprintName: string,
  sprintIdForMatch: string | undefined,
): void {
  const state = taskState.get(issueKey);
  if (!state) return;

  const fieldCtx: DailyChangelogFieldContext = {
    dailyChangelog,
    dateKey: toBurndownDateKey(new Date(entry.updatedAt)),
    issueKey,
    sprintIdForMatch,
    sprintName,
    state,
    summary,
    taskState,
  };

  for (const field of entry.fields ?? []) {
    appendDailyChangelogField(field, fieldCtx);
  }
}

export function enumerateSprintDays(startDate: Date, endDate: Date): string[] {
  const keys: string[] = [];
  const cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const last = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  while (cur <= last) {
    keys.push(toBurndownDateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
}

export function resolveCurrentBurndownDateKey(dayKeys: string[]): string {
  const todayKey = toBurndownDateKey(new Date());
  const firstKey = dayKeys[0];
  const lastKey = dayKeys[dayKeys.length - 1];
  if (firstKey && todayKey < firstKey) return firstKey;
  if (lastKey && todayKey > lastKey) return lastKey;
  return todayKey;
}

function applyClosedBurndownEvent(state: TaskState): { change: number; changeTP: number } {
  if (state.isDone) {
    return { change: 0, changeTP: 0 };
  }
  state.isDone = true;
  return { change: 0 - state.sp, changeTP: 0 - state.tp };
}

function applyReestimatedBurndownEvent(
  state: TaskState,
  wasInSprint: boolean,
  deltaSP: number,
  deltaTP: number,
): { change: number; changeTP: number } {
  state.sp += deltaSP;
  state.tp += deltaTP;
  return {
    change: wasInSprint ? deltaSP : 0,
    changeTP: wasInSprint ? deltaTP : 0,
  };
}

function applyAddedBurndownEvent(
  state: TaskState,
  wasInSprint: boolean,
): { change: number; changeTP: number } {
  state.inSprint = true;
  return {
    change: wasInSprint ? 0 : state.sp,
    changeTP: wasInSprint ? 0 : state.tp,
  };
}

function applyRemovedBurndownEvent(
  state: TaskState,
  wasInSprint: boolean,
): { change: number; changeTP: number } {
  if (!wasInSprint) {
    return { change: 0, changeTP: 0 };
  }
  state.inSprint = false;
  return { change: 0 - state.sp, changeTP: 0 - state.tp };
}

export function applyBurndownEventType(
  ev: BurndownEvent,
  state: TaskState,
): { change: number; changeTP: number; wasInSprint: boolean } {
  const wasInSprint = state.inSprint;
  if (ev.type === 'closed') {
    const result = applyClosedBurndownEvent(state);
    return { ...result, wasInSprint };
  }
  if (ev.type === 'reestimated') {
    const result = applyReestimatedBurndownEvent(state, wasInSprint, ev.deltaSP, ev.deltaTP);
    return { ...result, wasInSprint };
  }
  if (ev.type === 'added') {
    const result = applyAddedBurndownEvent(state, wasInSprint);
    return { ...result, wasInSprint };
  }
  if (ev.type === 'removed') {
    const result = applyRemovedBurndownEvent(state, wasInSprint);
    return { ...result, wasInSprint };
  }
  return { change: 0, changeTP: 0, wasInSprint };
}
