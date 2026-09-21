'use client';

import type { BurndownDayChangelogItem } from '../hooks/useBurndownChartData';

import { createContext, useContext } from 'react';

type MetricType = 'SP' | 'TP';

type TranslateFn = (key: string, params?: Record<string, number | string>) => string;

interface BurndownChartTooltipContextValue {
  changelogTypeLabels: Record<string, string>;
  locale: string;
  pinnedMetricType: MetricType;
  pinnedPoint: unknown | null;
  t: TranslateFn;
  theme: 'dark' | 'light';
}

export const BurndownChartTooltipContext = createContext<BurndownChartTooltipContextValue | null>(
  null
);

export function useBurndownChartTooltipContext(): BurndownChartTooltipContextValue {
  const value = useContext(BurndownChartTooltipContext);
  if (!value) {
    throw new Error('BurndownChartTooltipContext is missing');
  }
  return value;
}

export type { BurndownDayChangelogItem, MetricType, TranslateFn };
