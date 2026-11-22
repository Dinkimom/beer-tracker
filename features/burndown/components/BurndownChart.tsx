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
import { useBurndownHolidayDateKeys } from '../hooks/useBurndownHolidayDateKeys';

import { BurndownChartLoadedBody } from './BurndownChartLoadedBody';
import { BurndownChartLoadingBody } from './BurndownChartLoadingBody';
import { BurndownChartStatusBody } from './BurndownChartStatusBody';
import { BurndownChartTooltipContext } from './burndownChartTooltipContext';
import { BurndownPageFrame } from './BurndownPageFrame';

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

  const holidayDateKeys = useBurndownHolidayDateKeys(
    burndownData?.sprintInfo.startDate,
    burndownData?.sprintInfo.endDate
  );
  const chartData = useBurndownChartData({
    burndownData,
    holidayDateKeys,
    isArchived,
    isDraft,
  });

  const tileMetrics = useBurndownChartTileState({
    burndownData,
    goalTaskIdsForTiles,
    sprintId,
    sprintTasksForTiles,
  });

  const hideTpInBurndown =
    burndownData?.testingFlowMode === 'standalone_qa_tasks' ||
    (sprintTasksForTiles?.some((task) => task.hideTestPointsByIntegration === true) ?? false);

  let content: React.ReactNode;
  if (!sprintId) {
    content = (
      <BurndownChartStatusBody>
        <div className="text-center text-ds-text-muted">
          <p className="mb-2 text-lg font-medium">{t('burndown.selectSprintTitle')}</p>
          <p className="text-sm">{t('burndown.selectSprintDescription')}</p>
        </div>
      </BurndownChartStatusBody>
    );
  } else if (isLoading) {
    content = (
      <BurndownChartStatusBody>
        <BurndownChartLoadingBody message={t('burndown.loadingData')} />
      </BurndownChartStatusBody>
    );
  } else if (error || !burndownData) {
    content = (
      <BurndownChartStatusBody>
        <div className="text-center text-red-500 dark:text-red-400">
          <p className="mb-2 text-lg font-medium">{t('burndown.loadErrorTitle')}</p>
          <p className="text-sm">
            {error instanceof Error ? error.message : t('burndown.loadErrorFallback')}
          </p>
        </div>
      </BurndownChartStatusBody>
    );
  } else {
    content = (
      <BurndownChartTooltipContext.Provider value={tooltipContextValue}>
        <BurndownChartLoadedBody
          changelogTypeLabels={changelogTypeLabels}
          chartData={chartData}
          clearPinned={clearPinned}
          handlePointClick={handlePointClick}
          hideTpInBurndown={hideTpInBurndown}
          locale={locale}
          metrics={tileMetrics}
          pinnedMetricType={pinnedMetricType}
          pinnedPoint={pinnedPoint}
          pinnedPosition={pinnedPosition}
          theme={theme}
        />
      </BurndownChartTooltipContext.Provider>
    );
  }

  return (
    <BurndownPageFrame
      boardId={boardId}
      isLoading={isLoading}
      selectedSprintId={sprintId}
      sprints={sprints}
      sprintsLoading={sprintsLoading}
      onSprintChange={onSprintChange}
    >
      {content}
    </BurndownPageFrame>
  );
});
