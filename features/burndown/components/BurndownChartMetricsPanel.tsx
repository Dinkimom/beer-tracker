'use client';

import { useI18n } from '@/contexts/LanguageContext';
import { UnestimatedTasksCount } from '@/features/sprint/components/UnestimatedTasksCount';
import { formatPointsForDisplay } from '@/lib/pointsUtils';

import { BURNDOWN_SP_COLOR, BURNDOWN_TP_COLOR } from './burndownAreaChartHelpers';
import { BurndownMetricTile } from './BurndownMetricTile';

/** Плитки «сделано / объём» диаграммы сгорания. */
export interface BurndownTileMetrics {
  completedSP: number;
  completedTP: number;
  completionPercentSP: number;
  completionPercentTP: number;
  remainingSPForLabel: number;
  remainingTPForLabel: number;
  totalScopeSP: number;
  totalScopeTP: number;
  /** Задачи спринта без оценки: в объём плиток не вошли. */
  unestimatedCount: number;
}

export function BurndownChartMetricsPanel({
  hideTpInBurndown,
  metrics,
}: {
  hideTpInBurndown: boolean;
  metrics: BurndownTileMetrics;
}) {
  const { t } = useI18n();
  const {
    completedSP,
    completedTP,
    completionPercentSP,
    completionPercentTP,
    remainingSPForLabel,
    remainingTPForLabel,
    totalScopeSP,
    totalScopeTP,
  } = metrics;

  return (
    <div className="flex shrink-0 flex-col gap-1.5">
    <div className={`grid ${hideTpInBurndown ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
      <BurndownMetricTile
        barColor={BURNDOWN_SP_COLOR}
        completed={completedSP}
        completionPercent={completionPercentSP}
        remainingLabel={t('burndown.remainingSp', {
          value: formatPointsForDisplay(remainingSPForLabel),
        })}
        title={t('burndown.metrics.storyPointsTitle')}
        total={totalScopeSP}
      />
      {!hideTpInBurndown && (
        <BurndownMetricTile
          barColor={BURNDOWN_TP_COLOR}
          completed={completedTP}
          completionPercent={completionPercentTP}
          remainingLabel={t('burndown.remainingTp', {
            value: formatPointsForDisplay(remainingTPForLabel),
          })}
          title={t('burndown.metrics.testPointsTitle')}
          total={totalScopeTP}
        />
      )}
    </div>
      {metrics.unestimatedCount > 0 ? (
        <p className="text-xs">
          <UnestimatedTasksCount count={metrics.unestimatedCount} />
        </p>
      ) : null}
    </div>
  );
}
