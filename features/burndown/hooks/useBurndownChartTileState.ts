import type { BurndownChartDataPoint } from '../components/BurndownAreaChart';
import type { GetTaskInfoFn } from '@/hooks/useApiStorage';
import type { Task, TaskPosition } from '@/types';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useTaskState } from '@/features/sprint/hooks/useTaskState';
import { useOccupancyTaskOrderApi, useTaskPositionsApi } from '@/hooks/useApiStorage';
import { useRootStore } from '@/lib/layers';

import {
  buildBurndownFlattenedRows,
  useBurndownChartTileMetrics,
} from './useBurndownChartTileMetrics';

type BurndownTileBurndownData = Parameters<typeof useBurndownChartTileMetrics>[0]['burndownData'];

export function useBurndownChartTileState({
  burndownData,
  goalTaskIdsForTiles,
  sprintId,
  sprintTasksForTiles,
}: {
  burndownData: BurndownTileBurndownData;
  goalTaskIdsForTiles?: string[];
  sprintId: number | null;
  sprintTasksForTiles?: Task[];
}) {
  const { taskPositions: taskPositionsStore, sprintPlannerUi } = useRootStore();
  const globalNameFilter = sprintPlannerUi.globalNameFilter;

  const loadTilePositions = sprintTasksForTiles !== undefined && sprintId != null;
  const getTaskInfoRef = useRef<GetTaskInfoFn | undefined>(undefined);
  const [taskPositionsRaw] = useTaskPositionsApi(loadTilePositions ? sprintId : null, getTaskInfoRef);
  const [taskOrder] = useOccupancyTaskOrderApi(loadTilePositions ? sprintId : null);

  const { tasksMap, qaTasksByOriginalId } = useTaskState({
    tasks: sprintTasksForTiles ?? [],
    taskPositions: taskPositionsRaw,
    developers: [],
  });

  useEffect(() => {
    getTaskInfoRef.current = (taskId: string) => {
      const task = tasksMap.get(taskId) || qaTasksByOriginalId.get(taskId);
      return task
        ? { isQa: task.team === 'QA', devTaskKey: task.team === 'QA' ? task.originalTaskId : undefined }
        : { isQa: false };
    };
  }, [tasksMap, qaTasksByOriginalId]);

  const filteredTaskPositions = useMemo(() => {
    const m = new Map<string, TaskPosition>();
    taskPositionsRaw.forEach((pos, taskId) => {
      if (tasksMap.has(taskId) || qaTasksByOriginalId.has(taskId)) {
        m.set(taskId, pos);
      }
    });
    return m;
  }, [taskPositionsRaw, tasksMap, qaTasksByOriginalId]);

  const flattenedRowsForBurndownTiles = useMemo(
    () =>
      buildBurndownFlattenedRows({
        globalNameFilter,
        loadTilePositions,
        sprintTasksForTiles,
        filteredTaskPositions,
        taskOrder,
      }),
    [loadTilePositions, sprintTasksForTiles, filteredTaskPositions, globalNameFilter, taskOrder]
  );

  const positionsSettledForSprint =
    sprintId != null &&
    taskPositionsStore.positionsSettledSprintId === sprintId &&
    !taskPositionsStore.positionsLoadPending;

  return useBurndownChartTileMetrics({
    burndownData,
    flattenedRowsForBurndownTiles,
    filteredTaskPositions,
    goalTaskIdsForTiles,
    loadTilePositions,
    positionsSettledForSprint,
    sprintTasksForTiles,
  });
}

export function useBurndownPinnedPointHandlers() {
  const [pinnedPoint, setPinnedPoint] = useState<BurndownChartDataPoint | null>(null);
  const [pinnedMetricType, setPinnedMetricType] = useState<'SP' | 'TP'>('SP');
  const [pinnedPosition, setPinnedPosition] = useState<{ x: number; y: number } | null>(null);

  const handlePointClick = useMemo(
    () => (payload: BurndownChartDataPoint, metricType: 'SP' | 'TP', event: React.MouseEvent) => {
      setPinnedPoint(payload);
      setPinnedMetricType(metricType);
      setPinnedPosition({ x: event.clientX, y: event.clientY });
    },
    []
  );

  const clearPinned = useMemo(
    () => () => {
      setPinnedPoint(null);
      setPinnedMetricType('SP');
      setPinnedPosition(null);
    },
    []
  );

  return { pinnedPoint, pinnedMetricType, pinnedPosition, handlePointClick, clearPinned };
}
