'use client';

import type { SprintScoreRow } from '@/lib/sprints/sprintScoreHelpers';
import type { SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';
import type { Task } from '@/types';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import {
  SprintScoreMetricsPanel,
} from '@/features/sprint/components/sprintScoreUi';
import { computeBurndownTilesFromTasks } from '@/features/sprint/utils/sprintMetrics';
import { fetchSprintScore } from '@/lib/api/sprints';

import { SprintScoreBadge } from './SprintScoreBadge';
import { SprintScoreInfoButton } from './SprintScoreInfoButton';

interface SprintScoreBlockProps {
  completionRules?: SprintTaskCompletionRules | null;
  goalTaskIds?: string[] | string;
  /** Задачи спринта из планера — SP/TP считаем из них (как разбивка по статусам), goals — из API. */
  localTasks?: Task[];
  sprintId: number;
}

function withLocalSpTp(row: SprintScoreRow, tiles: {
  completedSP: number;
  completedTP: number;
  completionPercentSP: number;
  completionPercentTP: number;
  totalScopeSP: number;
  totalScopeTP: number;
}): SprintScoreRow {
  const spTotal = tiles.totalScopeSP;
  const qaTotal = tiles.totalScopeTP;
  const spDone = tiles.completedSP;
  const qaDone = tiles.completedTP;
  return {
    ...row,
    qa_done: qaDone,
    qa_left: Math.max(0, qaTotal - qaDone),
    qa_total: qaTotal,
    sp_done: spDone,
    sp_done_percent: tiles.completionPercentSP,
    sp_drop: spTotal > 0 ? Math.round((100 * Math.max(0, spTotal - spDone)) / spTotal) : 0,
    sp_left: Math.max(0, spTotal - spDone),
    sp_total: spTotal,
    tp_done_percent: tiles.completionPercentTP,
    tp_drop: qaTotal > 0 ? Math.round((100 * Math.max(0, qaTotal - qaDone)) / qaTotal) : 0,
  };
}

export function SprintScoreBlock({
  completionRules,
  goalTaskIds,
  localTasks,
  sprintId,
}: SprintScoreBlockProps) {
  const { t } = useI18n();
  const forDemoPlanner = useDemoPlannerBoardsQueryScope();
  const { data, isLoading, isError } = useQuery({
    queryKey: forDemoPlanner
      ? (['sprintScore', 'demo', sprintId] as const)
      : (['sprintScore', sprintId] as const),
    queryFn: () => fetchSprintScore(sprintId),
    staleTime: 5 * 60 * 1000,
    enabled: sprintId > 0,
  });

  const apiRows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const hideTp =
    data?.testingFlowMode === 'standalone_qa_tasks' ||
    (localTasks?.some((task) => task.hideTestPointsByIntegration === true) ?? false);

  const localTiles = useMemo(() => {
    if (!localTasks?.length) return null;
    return computeBurndownTilesFromTasks(localTasks, goalTaskIds, completionRules);
  }, [localTasks, goalTaskIds, completionRules]);

  const rows = useMemo(() => {
    if (!localTiles || localTiles.totalScopeSP + localTiles.totalScopeTP <= 0) {
      return apiRows;
    }
    if (apiRows.length === 0) {
      return [
        withLocalSpTp(
          {
            goals_done: 0,
            goals_percent: 0,
            goals_total: 0,
            mark: 0,
            mark_emoji: '🔴',
            mark_goals: 0,
            mark_sp: 0,
            mark_tp: 0,
            qa_done: 0,
            qa_left: 0,
            qa_total: 0,
            sname: '',
            sp_done: 0,
            sp_done_percent: 0,
            sp_drop: 0,
            sp_left: 0,
            sp_total: 0,
            sprint_id: sprintId,
            team: '',
            tp_done_percent: 0,
            tp_drop: 0,
          },
          localTiles
        ),
      ];
    }
    return apiRows.map((row) => withLocalSpTp(row, localTiles));
  }, [apiRows, localTiles, sprintId]);

  return (
    <div className="px-4 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <div className="mb-4">
        <div className="mb-2 flex items-center gap-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('sidebar.sprintScoreBlock.heading')}
          </h2>
          <SprintScoreInfoButton />
        </div>
        {rows[0] ? <SprintScoreBadge mark={rows[0].mark} /> : null}
      </div>

      {isLoading && apiRows.length === 0 && !localTiles && (
        <div className="text-sm text-gray-400 dark:text-gray-500">{t('sidebar.sprintScoreBlock.loading')}</div>
      )}

      {isError && apiRows.length === 0 && !localTiles && (
        <div className="text-sm text-red-500 dark:text-red-400">{t('sidebar.sprintScoreBlock.loadError')}</div>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {t('sidebar.sprintScoreBlock.emptyNotStarted')}
        </div>
      )}

      {rows.length > 0 && (
        <SprintScoreMetricsPanel
          goalsLabel={t('sidebar.sprintScoreBlock.goalsMetricLabel')}
          hideTp={hideTp}
          rows={rows}
        />
      )}
    </div>
  );
}
