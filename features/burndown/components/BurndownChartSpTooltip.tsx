'use client';

import type { TooltipProps } from 'recharts';

import { BurndownChartCustomTooltip } from './BurndownChartCustomTooltip';
import { useBurndownChartTooltipContext } from './burndownChartTooltipContext';

export function BurndownChartSpTooltip(props: TooltipProps<number, string>) {
  const ctx = useBurndownChartTooltipContext();
  if (ctx.pinnedPoint && ctx.pinnedMetricType === 'SP') {
    return null;
  }
  return (
    <BurndownChartCustomTooltip
      {...props}
      changelogTypeLabels={ctx.changelogTypeLabels}
      locale={ctx.locale}
      metricType="SP"
      t={ctx.t}
      theme={ctx.theme}
    />
  );
}
