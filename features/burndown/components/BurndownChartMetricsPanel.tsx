'use client';

import { useI18n } from '@/contexts/LanguageContext';
import { formatPointsForDisplay } from '@/lib/pointsUtils';

import { BURNDOWN_SP_COLOR, BURNDOWN_TP_COLOR } from './burndownAreaChartHelpers';
import { BurndownMetricTile } from './BurndownMetricTile';

interface BurndownChartMetricsPanelProps {
  completedSP: number;
  completedTP: number;
  completionPercentSP: number;
  completionPercentTP: number;
  hideTpInBurndown: boolean;
  remainingSPForLabel: number;
  remainingTPForLabel: number;
  totalScopeSP: number;
  totalScopeTP: number;
}

export function BurndownChartMetricsPanel({
  completedSP,
  completedTP,
  completionPercentSP,
  completionPercentTP,
  hideTpInBurndown,
  remainingSPForLabel,
  remainingTPForLabel,
  totalScopeSP,
  totalScopeTP,
}: BurndownChartMetricsPanelProps) {
  const { t } = useI18n();

  return (
    <div className={`grid shrink-0 ${hideTpInBurndown ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
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
  );
}
