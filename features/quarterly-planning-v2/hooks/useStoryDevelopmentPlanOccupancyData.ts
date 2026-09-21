'use client';

import type { QuarterlySprintInfo } from '../types';
import type { QuarterlyDevelopmentPlanParentKind } from '../utils/quarterlyDevelopmentPlanRow';
import type { SprintInfo } from '@/features/sprint/components/SprintPlanner/occupancy/OccupancyView';
import type { Developer, Task, TaskLink, TaskPosition } from '@/types';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { WORKING_DAYS } from '@/constants';
import { createQATasksMap } from '@/features/qa/utils/qaTaskUtils';
import { fetchEpicTasks } from '@/lib/api/epics';
import { fetchTeamMembers } from '@/lib/api/quarterly';
import { fetchSprintLinksBatch, fetchSprintPositionsBatch } from '@/lib/api/sprints';
import { fetchStoryTasks } from '@/lib/api/stories';

import { isRegisteredQuarterlySprint } from '../utils/quarterSprints';

import { applySprintPositionToTempMap } from './storyDevelopmentPlanOccupancyHelpers';

export interface StoryDevelopmentPlanOccupancyData {
  developers: Developer[];
  sprintInfos: SprintInfo[];
  taskLinks: TaskLink[];
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
}

function mapQuarterlySprintInfosForOccupancy(sprintInfos: QuarterlySprintInfo[]): SprintInfo[] {
  return sprintInfos.map((s) => ({
    id: s.id,
    name: s.name,
    quarter: s.quarter ?? null,
    startDate: s.startDate,
    endDate: s.endDate ?? s.startDate,
  }));
}

function registeredSprintIds(sprintInfos: QuarterlySprintInfo[]): number[] {
  return sprintInfos
    .filter(isRegisteredQuarterlySprint)
    .map((s) => Number(s.id))
    .filter((id) => Number.isFinite(id));
}

function buildOccupancyFromSprints(
  sprintInfos: SprintInfo[],
  sprintIds: number[],
  positionsPerSprint: TaskPosition[][],
  linksPerSprint: TaskLink[][],
  tasksMap: Map<string, Task>,
  taskIdFilter: Set<string>
): { taskLinks: TaskLink[]; taskPositions: Map<string, TaskPosition> } {
  const taskTrackerSprintIdx = new Map<string, number>();
  tasksMap.forEach((task, taskId) => {
    const sprintRef = task.sprints?.[0];
    const sprintName = sprintRef?.id ?? sprintRef?.display;
    if (sprintName) {
      const idx = sprintInfos.findIndex((s) => s.name === sprintName || String(s.id) === sprintName);
      if (idx >= 0) taskTrackerSprintIdx.set(taskId, idx);
    }
  });

  const tempPositions = new Map<
    string,
    { pos: TaskPosition; storageSprintIdx: number }
  >();
  const linksMap = new Map<string, TaskLink>();

  for (let sprintIdx = 0; sprintIdx < sprintIds.length; sprintIdx++) {
    const positions = positionsPerSprint[sprintIdx] ?? [];
    const links = linksPerSprint[sprintIdx] ?? [];

    positions.forEach((pos) => {
      applySprintPositionToTempMap(pos, sprintIdx, taskIdFilter, taskTrackerSprintIdx, tempPositions);
    });

    links.forEach((link) => {
      if (!taskIdFilter.has(link.fromTaskId) || !taskIdFilter.has(link.toTaskId)) return;
      if (!linksMap.has(link.id)) {
        linksMap.set(link.id, link);
      }
    });
  }

  const taskPositions = new Map<string, TaskPosition>();
  tempPositions.forEach(({ pos, storageSprintIdx }, taskId) => {
    const displaySprintIdx = taskTrackerSprintIdx.get(taskId) ?? storageSprintIdx;
    const displayOffset = displaySprintIdx * WORKING_DAYS;
    const segmentsWithOffset =
      pos.segments && pos.segments.length > 0
        ? pos.segments.map((seg) => ({
            startDay: seg.startDay + displayOffset,
            startPart: seg.startPart,
            duration: seg.duration,
          }))
        : pos.segments;
    taskPositions.set(taskId, {
      ...pos,
      startDay: pos.startDay + displayOffset,
      plannedStartDay:
        pos.plannedStartDay != null ? pos.plannedStartDay + displayOffset : undefined,
      segments: segmentsWithOffset,
    });
  });

  return { taskPositions, taskLinks: Array.from(linksMap.values()) };
}

interface UseStoryDevelopmentPlanOccupancyDataParams {
  boardId: number | null;
  enabled: boolean;
  parentKey: string | null;
  parentKind: QuarterlyDevelopmentPlanParentKind | null;
  parentName: string;
  sprintInfos: QuarterlySprintInfo[];
}

export function useStoryDevelopmentPlanOccupancyData({
  boardId,
  parentKey,
  parentKind,
  parentName,
  sprintInfos,
  enabled,
}: UseStoryDevelopmentPlanOccupancyDataParams) {
  const occupancySprintInfos = useMemo(
    () => mapQuarterlySprintInfosForOccupancy(sprintInfos),
    [sprintInfos]
  );
  const sprintIds = useMemo(() => registeredSprintIds(sprintInfos), [sprintInfos]);

  return useQuery({
    queryKey: [
      'developmentPlanOccupancy',
      parentKind,
      parentKey,
      boardId,
      sprintIds.join(','),
    ],
    enabled:
      enabled && !!parentKey && parentKind != null && boardId != null && sprintIds.length > 0,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<StoryDevelopmentPlanOccupancyData> => {
      const key = parentKey!;
      const kind = parentKind!;
      const board = boardId!;

      const loadChildTasks = () =>
        kind === 'epic' ? fetchEpicTasks(key, board) : fetchStoryTasks(key, board);

      const [rawTasks, positionsPerSprint, linksPerSprint, developers] = await Promise.all([
        loadChildTasks(),
        fetchSprintPositionsBatch(sprintIds),
        fetchSprintLinksBatch(sprintIds),
        fetchTeamMembers(board),
      ]);

      const tasksMap = new Map<string, Task>();
      for (const task of rawTasks) {
        tasksMap.set(task.id, {
          ...task,
          parent: task.parent ?? {
            id: key,
            key,
            display: parentName,
          },
        });
      }

      const realQaDevTaskIds = new Set(
        Array.from(tasksMap.values())
          .filter((t) => t.originalTaskId)
          .map((t) => t.originalTaskId!)
      );
      const devTasksWithoutRealQa = Array.from(tasksMap.values()).filter(
        (t) =>
          !t.originalTaskId &&
          t.testPoints != null &&
          t.testPoints > 0 &&
          !realQaDevTaskIds.has(t.id)
      );
      createQATasksMap(devTasksWithoutRealQa).forEach((qaTask) => {
        tasksMap.set(qaTask.id, qaTask);
      });

      const taskIdFilter = new Set(tasksMap.keys());
      const { taskPositions, taskLinks } = buildOccupancyFromSprints(
        occupancySprintInfos,
        sprintIds,
        positionsPerSprint,
        linksPerSprint,
        tasksMap,
        taskIdFilter
      );

      return {
        developers,
        sprintInfos: occupancySprintInfos,
        taskLinks,
        taskPositions,
        tasks: Array.from(tasksMap.values()),
      };
    },
  });
}
