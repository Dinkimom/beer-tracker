import type { QuarterlySprintInfo } from '../types';
import type { TaskPosition } from '@/types';

import { PARTS_PER_DAY } from '@/constants';
import {
  fetchSprintBatchTaskParents,
  fetchSprintPositionsBatch,
} from '@/lib/api/sprints';

import { isRegisteredQuarterlySprint, WORKING_DAYS_PER_SPRINT } from '../utils/quarterSprints';

export function plannedPositionDedupeKey(position: TaskPosition): string {
  return `${position.sourceTaskId ?? ''}:${position.startDay}:${position.duration}`;
}

export function dedupePlannedPositions(positions: TaskPosition[]): TaskPosition[] {
  const seen = new Set<string>();
  const result: TaskPosition[] = [];
  for (const position of positions) {
    const key = plannedPositionDedupeKey(position);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(position);
  }
  return result;
}

const durationDays = (p: TaskPosition) => Math.max(1, Math.ceil(p.duration / PARTS_PER_DAY));
const endDay = (p: TaskPosition) => p.startDay + durationDays(p);

function mergeAdjacentOnly(positions: TaskPosition[]): TaskPosition[] {
  if (positions.length <= 1) return positions;
  const sorted = [...positions].sort((a, b) => a.startDay - b.startDay);
  const merged: TaskPosition[] = [];
  let cur = { ...sorted[0] };
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    const curEnd = endDay(cur);
    if (next.startDay === curEnd) {
      const nextEnd = endDay(next);
      cur.duration = (nextEnd - cur.startDay) * PARTS_PER_DAY;
    } else {
      merged.push(cur);
      cur = { ...next };
    }
  }
  merged.push(cur);
  return merged;
}

export function getPlannedInSprintMaxStack(positions: TaskPosition[]): number {
  if (positions.length <= 1) return positions.length;
  const events: { t: number; delta: number }[] = [];
  for (const p of positions) {
    events.push({ t: p.startDay, delta: 1 });
    events.push({ t: endDay(p), delta: -1 });
  }
  events.sort((a, b) => a.t - b.t || b.delta - a.delta);
  let stack = 0;
  let maxStack = 0;
  for (const e of events) {
    stack += e.delta;
    maxStack = Math.max(maxStack, stack);
  }
  return maxStack;
}

function appendPlannedPosition(
  map: Map<string, TaskPosition[]>,
  rowKey: string,
  position: TaskPosition
): void {
  const list = map.get(rowKey) ?? [];
  const key = plannedPositionDedupeKey(position);
  if (list.some((existing) => plannedPositionDedupeKey(existing) === key)) {
    return;
  }
  list.push(position);
  map.set(rowKey, list);
}

export function buildTaskIdToEpicKey(
  taskIdToStoryKey: Map<string, string>,
  storyKeyToEpicKey: Map<string, string> | undefined,
  epicKeys: string[]
): Map<string, string> {
  const taskIdToEpicKey = new Map<string, string>();
  const epicKeysSet = new Set(epicKeys);
  for (const [taskId, storyKey] of taskIdToStoryKey) {
    const epicKey = storyKeyToEpicKey?.get(storyKey);
    if (epicKey && epicKeysSet.has(epicKey)) {
      taskIdToEpicKey.set(taskId, epicKey);
    }
  }
  return taskIdToEpicKey;
}

function toGlobalPosition(pos: TaskPosition, offset: number): TaskPosition {
  const globalStartDay = offset + pos.startDay;
  const durationParts = pos.duration ?? PARTS_PER_DAY;
  const durationDays = Math.max(1, Math.ceil(durationParts / PARTS_PER_DAY));
  return {
    taskId: pos.taskId,
    assignee: pos.assignee ?? '',
    startDay: globalStartDay,
    startPart: pos.startPart ?? 0,
    duration: durationDays * PARTS_PER_DAY,
    sourceTaskId: pos.taskId,
  };
}

function routePositionToRow(
  result: Map<string, TaskPosition[]>,
  position: TaskPosition,
  taskIdToStoryKey: Map<string, string>,
  taskIdToEpicKey: Map<string, string>,
  storyKeysSet: Set<string>,
  epicKeysSet: Set<string>
): void {
  const parentKey = taskIdToStoryKey.get(position.taskId);
  if (parentKey && (storyKeysSet.has(parentKey) || epicKeysSet.has(parentKey))) {
    appendPlannedPosition(result, parentKey, { ...position, taskId: parentKey });
    return;
  }
  const epicKey = taskIdToEpicKey.get(position.taskId);
  if (epicKey) {
    appendPlannedPosition(result, epicKey, { ...position, taskId: epicKey });
  }
}

export function collectPositionsByStoryAndEpic(
  registeredEntries: Array<{ sprint: QuarterlySprintInfo; sprintIdx: number }>,
  positionsPerSprint: TaskPosition[][],
  taskIdToStoryKey: Map<string, string>,
  taskIdToEpicKey: Map<string, string>,
  storyKeys: string[],
  epicKeys: string[]
): Map<string, TaskPosition[]> {
  const storyKeysSet = new Set(storyKeys);
  const epicKeysSet = new Set(epicKeys);
  const result = new Map<string, TaskPosition[]>();

  for (let batchIdx = 0; batchIdx < registeredEntries.length; batchIdx++) {
    const { sprintIdx } = registeredEntries[batchIdx]!;
    const positions = positionsPerSprint[batchIdx] ?? [];
    const offset = sprintIdx * WORKING_DAYS_PER_SPRINT;
    for (const pos of positions) {
      routePositionToRow(
        result,
        toGlobalPosition(pos, offset),
        taskIdToStoryKey,
        taskIdToEpicKey,
        storyKeysSet,
        epicKeysSet
      );
    }
  }
  return result;
}

export function buildMergedPlannedResult(result: Map<string, TaskPosition[]>): {
  maxStack: Map<string, number>;
  positions: Map<string, TaskPosition[]>;
} {
  const mergedResult = new Map<string, TaskPosition[]>();
  const maxStackResult = new Map<string, number>();
  for (const [key, list] of result) {
    const merged = mergeAdjacentOnly(dedupePlannedPositions(list));
    mergedResult.set(key, merged);
    maxStackResult.set(key, getPlannedInSprintMaxStack(merged));
  }
  return { positions: mergedResult, maxStack: maxStackResult };
}

export async function fetchRegisteredSprintPositions(
  sprintInfos: QuarterlySprintInfo[]
): Promise<{
  positionsPerSprint: TaskPosition[][];
  registeredEntries: Array<{ sprint: QuarterlySprintInfo; sprintIdx: number }>;
  taskIdToStoryKey: Map<string, string>;
}> {
  const registeredEntries = sprintInfos
    .map((sprint, sprintIdx) => ({ sprint, sprintIdx }))
    .filter(({ sprint }) => isRegisteredQuarterlySprint(sprint));

  const sprintIds = registeredEntries.map(({ sprint }) => sprint.id as number);
  const positionsPerSprint = await fetchSprintPositionsBatch(sprintIds);
  const taskIdToStoryKeyRaw = await fetchSprintBatchTaskParents(sprintIds);
  const taskIdToStoryKey = new Map(Object.entries(taskIdToStoryKeyRaw));

  return { registeredEntries, positionsPerSprint, taskIdToStoryKey };
}
