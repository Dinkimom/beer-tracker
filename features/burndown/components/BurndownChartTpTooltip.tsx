'use client';

import type { TooltipProps } from 'recharts';

import { BurndownChartCustomTooltip } from './BurndownChartCustomTooltip';
import { useBurndownChartTooltipContext } from './burndownChartTooltipContext';

export function BurndownChartTpTooltip(props: TooltipProps<number, string>) {
  const ctx = useBurndownChartTooltipContext();
  if (ctx.pinnedPoint && ctx.pinnedMetricType === 'TP') {
    return null;
  }
  return (
    <BurndownChartCustomTooltip
      {...props}
      changelogTypeLabels={ctx.changelogTypeLabels}
      locale={ctx.locale}
      metricType="TP"
      t={ctx.t}
      theme={ctx.theme}
    />
  );
}
