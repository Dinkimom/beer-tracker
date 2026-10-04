'use client';

import type { BurndownChartDataPoint } from './BurndownAreaChart';
import type { SprintListItem } from '@/types/tracker';

import { useI18n } from '@/contexts/LanguageContext';

import { BurndownAreaChart } from './BurndownAreaChart';
import { BurndownChartMetricsPanel } from './BurndownChartMetricsPanel';
import { BurndownChartPinnedTooltipOverlay } from './BurndownChartPinnedTooltipOverlay';
import { BurndownChartSeriesLegend } from './BurndownChartSeriesLegend';
import { BurndownChartSpTooltip } from './BurndownChartSpTooltip';
import { BurndownChartTpTooltip } from './BurndownChartTpTooltip';
import { BurndownPageFrame } from './BurndownPageFrame';

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
    <BurndownPageFrame
      boardId={boardId}
      isLoading={isLoading}
      selectedSprintId={sprintId}
      sprints={sprints}
      sprintsLoading={sprintsLoading}
      onSprintChange={onSprintChange}
    >
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
      <BurndownChartSeriesLegend hideTpInBurndown={hideTpInBurndown} />

      <div className="relative flex flex-1 flex-col gap-3">
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
    </BurndownPageFrame>
  );
}
