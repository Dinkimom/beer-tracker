'use client';

import type { QuarterlySprintInfo } from '../types';
import type { TaskPosition } from '@/types';

import { useQuery } from '@tanstack/react-query';

import { getPartsPerDay } from '@/constants';

import { enrichPositionsWithIssueMeta } from './loadPlannedInSprintPositionsEnrichment';
import {
  buildMergedPlannedResult,
  buildTaskIdToEpicKey,
  collectPositionsByStoryAndEpic,
  dedupePlannedPositions,
  fetchRegisteredSprintPositions,
  getPlannedInSprintMaxStack,
  plannedPositionDedupeKey,
} from './loadPlannedInSprintPositionsHelpers';

const durationDays = (p: TaskPosition) => Math.max(1, Math.ceil(p.duration / getPartsPerDay()));
const endDay = (p: TaskPosition) => p.startDay + durationDays(p);

function findLowestAvailableStackLevel(usedLevels: Set<number>): number {
  let level = 0;
  while (usedLevels.has(level)) level++;
  return level;
}

function collectUsedStackLevelsForPosition(
  order: TaskPosition[],
  indices: number[],
  positionIndex: number
): Set<number> {
  const start = order[positionIndex].startDay;
  const usedLevels = new Set<number>();

  for (let j = 0; j < positionIndex; j++) {
    if (endDay(order[j]) > start) usedLevels.add(indices[j]);
  }

  return usedLevels;
}

export { dedupePlannedPositions, getPlannedInSprintMaxStack, plannedPositionDedupeKey };

/** В компактном режиме одна колонка = одна неделя спринта (5 рабочих дней) */

/**
 * Индекс уровня стека для каждой позиции (0 = нижний).
 * Пересекающиеся по таймслоту получают разные уровни для отрисовки стаком.
 * Порядок позиций должен соответствовать order (например, по startDay).
 */
export function getPlannedInSprintStackIndices(positions: TaskPosition[]): number[] {
  if (positions.length === 0) return [];
  const order = [...positions].sort((a, b) => a.startDay - b.startDay);
  const indices: number[] = [];
  for (let i = 0; i < order.length; i++) {
    const usedLevels = collectUsedStackLevelsForPosition(order, indices, i);
    indices.push(findLowestAvailableStackLevel(usedLevels));
  }
  return indices;
}

/** Спринт считается текущим, если сегодня входит в [startDate, endDate]. */
function hasCurrentSprint(sprintInfos: QuarterlySprintInfo[]): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return sprintInfos.some((s) => {
    const start = new Date(s.startDate);
    start.setHours(0, 0, 0, 0);
    const end = s.endDate ? new Date(s.endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);
    return today >= start && (end == null || today <= end);
  });
}

interface LoadPlannedInSprintPositionsResult {
  maxStack: Map<string, number>;
  positions: Map<string, TaskPosition[]>;
}

/** Загрузка «запланировано в спринт» одним batch (positions + task-parents). */
async function loadPlannedInSprintPositions(
  storyKeys: string[],
  epicKeys: string[],
  sprintInfos: QuarterlySprintInfo[],
  storyKeyToEpicKey?: Map<string, string>
): Promise<LoadPlannedInSprintPositionsResult> {
  if (sprintInfos.length === 0 || (storyKeys.length === 0 && epicKeys.length === 0)) {
    return { positions: new Map(), maxStack: new Map() };
  }

  const { registeredEntries, positionsPerSprint, taskIdToStoryKey } =
    await fetchRegisteredSprintPositions(sprintInfos);
  const taskIdToEpicKey = buildTaskIdToEpicKey(taskIdToStoryKey, storyKeyToEpicKey, epicKeys);
  const result = collectPositionsByStoryAndEpic(
    registeredEntries,
    positionsPerSprint,
    taskIdToStoryKey,
    taskIdToEpicKey,
    storyKeys,
    epicKeys
  );
  await enrichPositionsWithIssueMeta(result);
  return buildMergedPlannedResult(result);
}

interface UsePlannedInSprintPositionsOptions {
  enabled?: boolean;
}

/**
 * Загружает «запланированное в спринт» для стори и эпиков.
 *
 * Стратегия: сначала все планы по спринтам (batch positions) и все задачи в этих спринтах
 * из Tracker (batch task-parents), затем сопоставление по story/epic. Так один запрос
 * по спринтам вместо N по стори/эпикам.
 * Прошедшие спринты кэшируются дольше, текущий — с коротким staleTime для актуальных данных.
 */
export function usePlannedInSprintPositions(
  _boardId: number | null,
  storyKeys: string[],
  epicKeys: string[],
  sprintInfos: QuarterlySprintInfo[],
  storyKeyToEpicKey?: Map<string, string>,
  options?: UsePlannedInSprintPositionsOptions
): {
  plannedInSprintPositions: Map<string, TaskPosition[]>;
  plannedInSprintMaxStack: Map<string, number>;
  isLoading: boolean;
  isFetched: boolean;
} {
  const storyKeyToEpicKeyKey = storyKeyToEpicKey
    ? Array.from(storyKeyToEpicKey.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .join(',')
    : '';

  const isCurrentSprintIncluded = hasCurrentSprint(sprintInfos);
  const staleTime = isCurrentSprintIncluded ? 1000 * 30 : 1000 * 60 * 10;

  const enabled = options?.enabled ?? true;

  const { data, isLoading, isFetched } = useQuery({
    queryKey: [
      'planned-in-sprint-positions',
      storyKeys.slice().sort().join(','),
      epicKeys.slice().sort().join(','),
      sprintInfos.map((s) => s.id).join(','),
      storyKeyToEpicKeyKey,
    ],
    queryFn: () => loadPlannedInSprintPositions(storyKeys, epicKeys, sprintInfos, storyKeyToEpicKey),
    enabled: enabled && sprintInfos.length > 0 && (storyKeys.length > 0 || epicKeys.length > 0),
    staleTime,
  });

  const plannedInSprintPositions = data?.positions ?? new Map<string, TaskPosition[]>();
  const plannedInSprintMaxStack = data?.maxStack ?? new Map<string, number>();
  return { plannedInSprintPositions, plannedInSprintMaxStack, isLoading, isFetched };
}
