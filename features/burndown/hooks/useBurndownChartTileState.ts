import type { BurndownChartDataPoint } from '../components/BurndownAreaChart';
import type { SprintTimelineTotals } from '@/lib/burndown/taskChangelogTimeline';
import type { Task } from '@/types';

import { useMemo, useState } from 'react';

import { computeBurndownTilesFromTasks } from '@/features/sprint/utils/sprintMetrics';
import { useSprintTaskCompletionRules } from '@/hooks/useSprintTaskCompletionRules';
import { useRootStore } from '@/lib/layers';

import { computeBurndownScopeTiles } from '../utils/burndownScopeTiles';

import { useBurndownMetrics } from './useBurndownMetrics';

export function useBurndownChartTileState({
  burndownData,
  goalTaskIdsForTiles,
  sprintId,
  sprintTasksForTiles,
}: {
  burndownData: {
    currentSP?: number;
    currentTP?: number;
    sprintTimelineTotals?: SprintTimelineTotals | null;
  } | null | undefined;
  goalTaskIdsForTiles?: string[];
  sprintId: number | null;
  sprintTasksForTiles?: Task[];
}) {
  const { sprintPlannerUi } = useRootStore();
  const globalNameFilter = sprintPlannerUi.globalNameFilter;
  const completionRules = useSprintTaskCompletionRules();

  const scopeTiles = useMemo(() => {
    if (sprintId == null || !sprintTasksForTiles?.length) {
      return null;
    }
    return computeBurndownScopeTiles(sprintTasksForTiles, globalNameFilter);
  }, [sprintId, sprintTasksForTiles, globalNameFilter]);

  const taskFallbackTileMetrics = useMemo(() => {
    if (sprintTasksForTiles === undefined) {
      return null;
    }
    return computeBurndownTilesFromTasks(sprintTasksForTiles, goalTaskIdsForTiles, completionRules);
  }, [sprintTasksForTiles, goalTaskIdsForTiles, completionRules]);

  const taskTileMetrics = useMemo(() => {
    const scopeShowsZeroButTasksHaveScope =
      scopeTiles != null &&
      scopeTiles.totalScopeSP === 0 &&
      scopeTiles.totalScopeTP === 0 &&
      (taskFallbackTileMetrics?.totalScopeSP ?? 0) + (taskFallbackTileMetrics?.totalScopeTP ?? 0) > 0;

    if (scopeShowsZeroButTasksHaveScope) {
      return taskFallbackTileMetrics;
    }
    return scopeTiles ?? taskFallbackTileMetrics;
  }, [scopeTiles, taskFallbackTileMetrics]);

  const changelogTileMetrics = useBurndownMetrics({
    burndownData:
      burndownData != null ? { sprintTimelineTotals: burndownData.sprintTimelineTotals } : null,
  });

  const metrics = taskTileMetrics ?? changelogTileMetrics;

  const remainingSPForLabel =
    taskTileMetrics != null
      ? Math.max(0, taskTileMetrics.totalScopeSP - taskTileMetrics.completedSP)
      : (burndownData?.sprintTimelineTotals?.remainingSP ?? burndownData?.currentSP ?? 0);
  const remainingTPForLabel =
    taskTileMetrics != null
      ? Math.max(0, taskTileMetrics.totalScopeTP - taskTileMetrics.completedTP)
      : (burndownData?.sprintTimelineTotals?.remainingTP ?? burndownData?.currentTP ?? 0);

  return {
    ...metrics,
    remainingSPForLabel,
    remainingTPForLabel,
    taskTileMetrics,
  };
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
