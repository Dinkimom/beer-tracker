'use client';

import type { BurndownChartDataPoint } from './BurndownAreaChart';
import type { BurndownTileMetrics } from './BurndownChartMetricsPanel';

import { useI18n } from '@/contexts/LanguageContext';

import { BurndownAreaChart } from './BurndownAreaChart';
import { BurndownChartMetricsPanel } from './BurndownChartMetricsPanel';
import { BurndownChartPinnedTooltipOverlay } from './BurndownChartPinnedTooltipOverlay';
import { BurndownChartSeriesLegend } from './BurndownChartSeriesLegend';

interface BurndownChartLoadedBodyProps {
  changelogTypeLabels: Record<string, string>;
  chartData: BurndownChartDataPoint[];
  hideTpInBurndown: boolean;
  locale: string;
  metrics: BurndownTileMetrics;
  pinnedMetricType: 'SP' | 'TP';
  pinnedPoint: BurndownChartDataPoint | null;
  pinnedPosition: { x: number; y: number } | null;
  theme: 'dark' | 'light';
  clearPinned: () => void;
  handlePointClick: (
    payload: BurndownChartDataPoint,
    metricType: 'SP' | 'TP',
    event: React.MouseEvent
  ) => void;
}

export function BurndownChartLoadedBody({
  changelogTypeLabels,
  chartData,
  clearPinned,
  handlePointClick,
  hideTpInBurndown,
  locale,
  metrics,
  pinnedMetricType,
  pinnedPoint,
  pinnedPosition,
  theme,
}: BurndownChartLoadedBodyProps) {
  const { t } = useI18n();

  return (
    <>
      <BurndownChartMetricsPanel hideTpInBurndown={hideTpInBurndown} metrics={metrics} />
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
            type="TP"
            onPointClick={handlePointClick}
          />
        )}
      </div>
    </>
  );
}
