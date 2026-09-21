'use client';

import type { TranslateFn } from './burndownChartTooltipContext';

interface BurndownChartTooltipMetricsRowProps {
  dash: string;
  factColor: string;
  factValue: number | undefined;
  metricLabel: string;
  mutedColor: string;
  planValue: number | undefined;
  showChangelogSection: boolean;
  t: TranslateFn;
}

function formatBurndownMetricDisplayValue(value: number | undefined, dash: string): string {
  return typeof value === 'number' ? value.toFixed(1) : dash;
}

export function BurndownChartTooltipMetricsRow({
  factValue,
  planValue,
  factColor,
  metricLabel,
  mutedColor,
  dash,
  showChangelogSection,
  t,
}: BurndownChartTooltipMetricsRowProps) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: showChangelogSection ? 10 : 0, fontSize: 12, color: mutedColor }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 14, height: 3, backgroundColor: factColor, borderRadius: 1 }} />
        {t('burndown.changelog.factLine', {
          value: formatBurndownMetricDisplayValue(factValue, dash),
          metric: metricLabel,
        })}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 14, height: 2, border: '1px dashed #94a3b8', borderRadius: 1 }} />
        {t('burndown.changelog.planLine', {
          value: formatBurndownMetricDisplayValue(planValue, dash),
          metric: metricLabel,
        })}
      </span>
    </div>
  );
}
