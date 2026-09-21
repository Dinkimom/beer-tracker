import type { BurndownDayChangelogItem, MetricType } from './burndownChartTooltipContext';

import {
  burndownChangelogItemMatchesMetric,
  formatBurndownNumericChange,
} from './burndownChartTooltipFilterHelpers';

export const BURNDOWN_TOOLTIP_CHANGELOG_MAX_HEIGHT = 220;
const BURNDOWN_TOOLTIP_MAX_SUMMARY_LENGTH = 80;

interface BurndownTooltipThemeColors {
  bgColor: string;
  borderColor: string;
  mutedColor: string;
  textColor: string;
}

export function resolveBurndownTooltipTheme(theme: 'dark' | 'light'): BurndownTooltipThemeColors {
  const isDark = theme === 'dark';
  return {
    bgColor: isDark ? '#1f2937' : '#ffffff',
    borderColor: isDark ? '#374151' : '#e5e7eb',
    textColor: isDark ? '#f9fafb' : '#111827',
    mutedColor: isDark ? '#9ca3af' : '#6b7280',
  };
}

export function filterBurndownDayChangelog(
  rawChangelog: BurndownDayChangelogItem[],
  isTP: boolean
): BurndownDayChangelogItem[] {
  return rawChangelog.filter((item) => burndownChangelogItemMatchesMetric(item, isTP));
}

export function truncateBurndownSummary(summary: string, maxLength = BURNDOWN_TOOLTIP_MAX_SUMMARY_LENGTH): string {
  if (summary.length <= maxLength) {
    return summary;
  }
  return `${summary.slice(0, maxLength)}…`;
}

export function formatBurndownChangelogChange(
  item: BurndownDayChangelogItem,
  isTP: boolean
): { changeColor: string; changeStr: string } {
  const changeVal = isTP ? item.changeTP : item.change;
  return formatBurndownNumericChange(changeVal);
}

export function resolveBurndownMetricValues(
  metricType: MetricType,
  point: {
    remainingSP?: number;
    idealSP?: number;
    remainingTP?: number;
    idealTP?: number;
  } | undefined
): {
  factColor: string;
  factValue: number | undefined;
  isTP: boolean;
  metricLabel: string;
  planValue: number | undefined;
} {
  const isTP = metricType === 'TP';
  return {
    isTP,
    factValue: isTP ? point?.remainingTP : point?.remainingSP,
    planValue: isTP ? point?.idealTP : point?.idealSP,
    factColor: isTP ? '#f59e0b' : '#3b82f6',
    metricLabel: isTP ? 'TP' : 'SP',
  };
}
