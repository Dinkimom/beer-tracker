'use client';

import { useI18n } from '@/contexts/LanguageContext';
import { formatPointsForDisplay } from '@/lib/pointsUtils';

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
    <div className={`grid ${hideTpInBurndown ? 'grid-cols-1' : 'grid-cols-2'} gap-4 mb-6 flex-shrink-0`}>
      <BurndownMetricTile
        barClassName="bg-blue-600 dark:bg-blue-500"
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
          barClassName="bg-amber-600 dark:bg-amber-500"
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
