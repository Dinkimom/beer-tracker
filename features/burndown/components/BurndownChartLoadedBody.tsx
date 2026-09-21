'use client';

import type { BurndownChartDataPoint } from './BurndownAreaChart';
import type { SprintListItem } from '@/types/tracker';

import { useI18n } from '@/contexts/LanguageContext';
import { SprintSelectorWithCreate } from '@/features/sprint/components/SprintSelectorWithCreate';

import { BurndownAreaChart } from './BurndownAreaChart';
import { BurndownChartMetricsPanel } from './BurndownChartMetricsPanel';
import { BurndownChartPinnedTooltipOverlay } from './BurndownChartPinnedTooltipOverlay';
import { BurndownChartSpTooltip } from './BurndownChartSpTooltip';
import { BurndownChartTpTooltip } from './BurndownChartTpTooltip';

interface BurndownChartLoadedBodyProps {
  boardId?: number | null;
  changelogTypeLabels: Record<string, string>;
  chartData: BurndownChartDataPoint[];
  completedSP: number;
  completedTP: number;
  completionPercentSP: number;
  completionPercentTP: number;
  hideTpInBurndown: boolean;
  isLoading: boolean;
  locale: string;
  pinnedMetricType: 'SP' | 'TP';
  pinnedPoint: BurndownChartDataPoint | null;
  pinnedPosition: { x: number; y: number } | null;
  remainingSPForLabel: number;
  remainingTPForLabel: number;
  sprintId: number;
  sprints: SprintListItem[];
  sprintsLoading: boolean;
  theme: 'dark' | 'light';
  totalScopeSP: number;
  totalScopeTP: number;
  clearPinned: () => void;
  handlePointClick: (
    payload: BurndownChartDataPoint,
    metricType: 'SP' | 'TP',
    event: React.MouseEvent
  ) => void;
  onSprintChange: (sprintId: number | null) => void;
}

export function BurndownChartLoadedBody({
  boardId = null,
  changelogTypeLabels,
  chartData,
  clearPinned,
  completedSP,
  completedTP,
  completionPercentSP,
  completionPercentTP,
  handlePointClick,
  hideTpInBurndown,
  isLoading,
  locale,
  pinnedMetricType,
  pinnedPoint,
  pinnedPosition,
  remainingSPForLabel,
  remainingTPForLabel,
  sprintId,
  sprints,
  sprintsLoading,
  theme,
  totalScopeSP,
  totalScopeTP,
  onSprintChange,
}: BurndownChartLoadedBodyProps) {
  const { t } = useI18n();

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="shrink-0">
            <SprintSelectorWithCreate
              boardId={boardId}
              loading={isLoading}
              selectedSprintId={sprintId}
              sprints={sprints}
              sprintsLoading={sprintsLoading}
              onSprintChange={onSprintChange}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-6">
        <BurndownChartMetricsPanel
          completedSP={completedSP}
          completedTP={completedTP}
          completionPercentSP={completionPercentSP}
          completionPercentTP={completionPercentTP}
          hideTpInBurndown={hideTpInBurndown}
          remainingSPForLabel={remainingSPForLabel}
          remainingTPForLabel={remainingTPForLabel}
          totalScopeSP={totalScopeSP}
          totalScopeTP={totalScopeTP}
        />

        <div className="flex-1 flex flex-col gap-6 min-h-0 relative">
          {pinnedPoint && pinnedPosition ? (
            <BurndownChartPinnedTooltipOverlay
              changelogTypeLabels={changelogTypeLabels}
              clearPinned={clearPinned}
              locale={locale}
              pinnedMetricType={pinnedMetricType}
              pinnedPoint={pinnedPoint}
              pinnedPosition={pinnedPosition}
              theme={theme}
            />
          ) : null}
          <BurndownAreaChart
            chartData={chartData}
            idealSeriesName={t('burndown.chart.idealLine')}
            pinnedPoint={pinnedMetricType === 'SP' ? pinnedPoint : null}
            remainingSeriesName={t('burndown.chart.remainingSp')}
            theme={theme}
            title={t('burndown.metrics.storyPointsTitle')}
            tooltipContent={BurndownChartSpTooltip}
            type="SP"
            onPointClick={handlePointClick}
          />
          {!hideTpInBurndown && (
            <BurndownAreaChart
              chartData={chartData}
              idealSeriesName={t('burndown.chart.idealLine')}
              pinnedPoint={pinnedMetricType === 'TP' ? pinnedPoint : null}
              remainingSeriesName={t('burndown.chart.remainingTp')}
              theme={theme}
              title={t('burndown.metrics.testPointsTitle')}
              tooltipContent={BurndownChartTpTooltip}
              type="TP"
              onPointClick={handlePointClick}
            />
          )}
        </div>
      </div>
    </div>
  );
}
