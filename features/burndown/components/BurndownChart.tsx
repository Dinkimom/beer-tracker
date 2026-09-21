'use client';

import type { Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { useQuery } from '@tanstack/react-query';
import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { useThemeStorage } from '@/hooks/useLocalStorage';
import { fetchBurndownData } from '@/lib/beerTrackerApi';

import { useBurndownChartData } from '../hooks/useBurndownChartData';
import {
  useBurndownChartTileState,
  useBurndownPinnedPointHandlers,
} from '../hooks/useBurndownChartTileState';

import { BurndownChartEmptySprintState } from './BurndownChartEmptySprintState';
import { BurndownChartErrorState } from './BurndownChartErrorState';
import { BurndownChartLoadedBody } from './BurndownChartLoadedBody';
import { BurndownChartLoadingState } from './BurndownChartLoadingState';
import { BurndownChartTooltipContext } from './burndownChartTooltipContext';

interface BurndownChartProps {
  boardId?: number;
  /** Идентификаторы целей спринта (как в `MetricsTab`), чтобы исключить их из плиток. */
  goalTaskIdsForTiles?: string[];
  sprintId: number | null;
  sprints: SprintListItem[];
  sprintsLoading?: boolean;
  /** После загрузки задач — плитки «X / Y» и % по объёму «Занятость» (строки с фазой на таймлайне); до загрузки позиций — как сумма по задачам; `undefined` = плитки из changelog. */
  sprintTasksForTiles?: Task[];
  onSprintChange: (sprintId: number | null) => void;
}

export const BurndownChart = observer(function BurndownChart({
  boardId,
  sprintTasksForTiles,
  goalTaskIdsForTiles,
  sprintId,
  sprints,
  sprintsLoading = false,
  onSprintChange,
}: BurndownChartProps) {
  const { t, language } = useI18n();
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
  const changelogTypeLabels = useMemo(
    () => ({
      closed: t('burndown.changelog.types.closed'),
      added: t('burndown.changelog.types.added'),
      removed: t('burndown.changelog.types.removed'),
      reestimated: t('burndown.changelog.types.reestimated'),
      status_change: t('burndown.changelog.types.status_change'),
      story_points_change: t('burndown.changelog.types.story_points_change'),
      test_points_change: t('burndown.changelog.types.test_points_change'),
      sprint_field_change: t('burndown.changelog.types.sprint_field_change'),
    }),
    [t]
  );

  const isDemoPlannerBoards = useDemoPlannerBoardsQueryScope();
  const [theme] = useThemeStorage();
  const { pinnedPoint, pinnedMetricType, pinnedPosition, handlePointClick, clearPinned } =
    useBurndownPinnedPointHandlers();

  const tooltipContextValue = useMemo(
    () => ({
      changelogTypeLabels,
      locale,
      pinnedMetricType,
      pinnedPoint,
      t,
      theme,
    }),
    [changelogTypeLabels, locale, pinnedMetricType, pinnedPoint, t, theme]
  );

  const selectedSprint = useMemo(() => {
    return sprints.find((s) => s.id === sprintId);
  }, [sprints, sprintId]);

  const isDraft = selectedSprint?.status === 'draft';
  const isArchived = selectedSprint?.archived || selectedSprint?.status === 'archived';

  const {
    data: burndownData,
    isLoading,
    error,
  } = useQuery({
    queryKey: isDemoPlannerBoards
      ? (['burndown', 'demo', sprintId, boardId] as const)
      : (['burndown', sprintId, boardId] as const),
    queryFn: () =>
      sprintId ? fetchBurndownData(sprintId, boardId ?? undefined) : null,
    enabled: !!sprintId,
    staleTime: 5 * 60 * 1000,
  });

  const chartData = useBurndownChartData({
    burndownData,
    isArchived,
    isDraft,
  });

  const {
    completedSP,
    completedTP,
    totalScopeSP,
    totalScopeTP,
    completionPercentSP,
    completionPercentTP,
    remainingSPForLabel,
    remainingTPForLabel,
  } = useBurndownChartTileState({
    burndownData,
    goalTaskIdsForTiles,
    sprintId,
    sprintTasksForTiles,
  });

  if (!sprintId) {
    return (
      <BurndownChartEmptySprintState
        boardId={boardId}
        sprints={sprints}
        sprintsLoading={sprintsLoading}
        t={t}
        onSprintChange={onSprintChange}
      />
    );
  }

  if (isLoading) {
    return (
      <BurndownChartLoadingState
        boardId={boardId}
        sprintId={sprintId}
        sprints={sprints}
        sprintsLoading={sprintsLoading}
        t={t}
        onSprintChange={onSprintChange}
      />
    );
  }

  if (error || !burndownData) {
    return (
      <BurndownChartErrorState
        boardId={boardId}
        error={error}
        sprintId={sprintId}
        sprints={sprints}
        sprintsLoading={sprintsLoading}
        t={t}
        onSprintChange={onSprintChange}
      />
    );
  }

  const hideTpFromTasksIntegration =
    sprintTasksForTiles?.some((task) => task.hideTestPointsByIntegration === true) ?? false;
  const hideTpInBurndown =
    burndownData.testingFlowMode === 'standalone_qa_tasks' || hideTpFromTasksIntegration;

  return (
    <BurndownChartTooltipContext.Provider value={tooltipContextValue}>
      <BurndownChartLoadedBody
        boardId={boardId}
        changelogTypeLabels={changelogTypeLabels}
        chartData={chartData}
        clearPinned={clearPinned}
        completedSP={completedSP}
        completedTP={completedTP}
        completionPercentSP={completionPercentSP}
        completionPercentTP={completionPercentTP}
        handlePointClick={handlePointClick}
        hideTpInBurndown={hideTpInBurndown}
        isLoading={isLoading}
        locale={locale}
        pinnedMetricType={pinnedMetricType}
        pinnedPoint={pinnedPoint}
        pinnedPosition={pinnedPosition}
        remainingSPForLabel={remainingSPForLabel}
        remainingTPForLabel={remainingTPForLabel}
        sprintId={sprintId}
        sprints={sprints}
        sprintsLoading={sprintsLoading}
        theme={theme}
        totalScopeSP={totalScopeSP}
        totalScopeTP={totalScopeTP}
        onSprintChange={onSprintChange}
      />
    </BurndownChartTooltipContext.Provider>
  );
});
