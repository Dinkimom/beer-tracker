import type { OccupancyTaskOrder } from '@/lib/api/types';
import type { SprintTimelineTotals } from '@/lib/burndown/taskChangelogTimeline';
import type { Task, TaskPosition } from '@/types';

import { useMemo } from 'react';

import { computeBurndownTilesFromOccupancyRows } from '@/features/sprint/components/SprintPlanner/occupancy/occupancyViewHelpers';
import { buildFlattenedRows } from '@/features/sprint/components/SprintPlanner/occupancy/utils/buildFlattenedRows';
import { computeBurndownTilesFromTasks } from '@/features/sprint/utils/sprintMetrics';

import { useBurndownMetrics } from './useBurndownMetrics';

export function useBurndownChartTileMetrics(args: {
  burndownData: {
    currentSP?: number;
    currentTP?: number;
    sprintTimelineTotals?: SprintTimelineTotals | null;
  } | null | undefined;
  flattenedRowsForBurndownTiles: ReturnType<typeof buildFlattenedRows>;
  filteredTaskPositions: Map<string, TaskPosition>;
  goalTaskIdsForTiles?: string[];
  loadTilePositions: boolean;
  positionsSettledForSprint: boolean;
  sprintTasksForTiles?: Task[];
}) {
  const occupancyBurndownTiles = useMemo(() => {
    if (!args.loadTilePositions || !args.sprintTasksForTiles?.length) {
      return null;
    }
    if (!args.positionsSettledForSprint) {
      return null;
    }
    return computeBurndownTilesFromOccupancyRows(
      args.flattenedRowsForBurndownTiles,
      args.filteredTaskPositions
    );
  }, [
    args.loadTilePositions,
    args.sprintTasksForTiles,
    args.positionsSettledForSprint,
    args.flattenedRowsForBurndownTiles,
    args.filteredTaskPositions,
  ]);

  const taskFallbackTileMetrics = useMemo(() => {
    if (args.sprintTasksForTiles === undefined) {
      return null;
    }
    return computeBurndownTilesFromTasks(args.sprintTasksForTiles, args.goalTaskIdsForTiles);
  }, [args.sprintTasksForTiles, args.goalTaskIdsForTiles]);

  const taskTileMetrics = useMemo(() => {
    const occupancyShowsZeroButTasksHaveScope =
      occupancyBurndownTiles != null &&
      occupancyBurndownTiles.totalScopeSP === 0 &&
      occupancyBurndownTiles.totalScopeTP === 0 &&
      (taskFallbackTileMetrics?.totalScopeSP ?? 0) + (taskFallbackTileMetrics?.totalScopeTP ?? 0) > 0;

    if (occupancyShowsZeroButTasksHaveScope) {
      return taskFallbackTileMetrics;
    }
    return occupancyBurndownTiles ?? taskFallbackTileMetrics;
  }, [occupancyBurndownTiles, taskFallbackTileMetrics]);

  const changelogTileMetrics = useBurndownMetrics({
    burndownData:
      args.burndownData != null
        ? { sprintTimelineTotals: args.burndownData.sprintTimelineTotals }
        : null,
  });

  const metrics = taskTileMetrics ?? changelogTileMetrics;

  const remainingSPForLabel =
    taskTileMetrics != null
      ? Math.max(0, taskTileMetrics.totalScopeSP - taskTileMetrics.completedSP)
      : (args.burndownData?.sprintTimelineTotals?.remainingSP ?? args.burndownData?.currentSP ?? 0);
  const remainingTPForLabel =
    taskTileMetrics != null
      ? Math.max(0, taskTileMetrics.totalScopeTP - taskTileMetrics.completedTP)
      : (args.burndownData?.sprintTimelineTotals?.remainingTP ?? args.burndownData?.currentTP ?? 0);

  return {
    ...metrics,
    remainingSPForLabel,
    remainingTPForLabel,
    taskTileMetrics,
  };
}

export function buildBurndownFlattenedRows(args: {
  globalNameFilter: string;
  loadTilePositions: boolean;
  sprintTasksForTiles?: Task[];
  filteredTaskPositions: Map<string, TaskPosition>;
  taskOrder: OccupancyTaskOrder | null | undefined;
}) {
  if (!args.loadTilePositions || !args.sprintTasksForTiles) {
    return [];
  }
  return buildFlattenedRows(
    args.sprintTasksForTiles,
    args.filteredTaskPositions,
    args.globalNameFilter,
    undefined,
    args.taskOrder ?? undefined
  );
}
