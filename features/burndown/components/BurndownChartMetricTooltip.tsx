'use client';

import type { MetricType } from './burndownChartTooltipContext';
import type { TooltipProps } from 'recharts';

import { BurndownChartCustomTooltip } from './BurndownChartCustomTooltip';
import { useBurndownChartTooltipContext } from './burndownChartTooltipContext';

/** Тултип графика SP или TP; скрыт, пока у этого графика закреплена точка. */
export function BurndownChartMetricTooltip({
  metricType,
  ...props
}: TooltipProps<number, string> & { metricType: MetricType }) {
  const ctx = useBurndownChartTooltipContext();
  if (ctx.pinnedPoint && ctx.pinnedMetricType === metricType) {
    return null;
  }
  return (
    <BurndownChartCustomTooltip
      {...props}
      changelogTypeLabels={ctx.changelogTypeLabels}
      locale={ctx.locale}
      metricType={metricType}
      t={ctx.t}
      theme={ctx.theme}
    />
  );
}
