import type { PointsType } from '@/types';

interface BurndownAreaChartMetricConfig {
  gradientColor: string;
  gradientId: string;
  idealDataKey: 'idealSP' | 'idealTP';
  isSP: boolean;
  remainingDataKey: 'remainingSP' | 'remainingTP';
}

interface BurndownChartAxisColors {
  stroke: string;
  tickFill: string;
}

export function resolveBurndownAreaChartMetricConfig(type: PointsType): BurndownAreaChartMetricConfig {
  const isSP = type === 'SP';
  return {
    isSP,
    gradientId: isSP ? 'colorSP' : 'colorTP',
    gradientColor: isSP ? '#3b82f6' : '#f59e0b',
    idealDataKey: isSP ? 'idealSP' : 'idealTP',
    remainingDataKey: isSP ? 'remainingSP' : 'remainingTP',
  };
}

export function resolveBurndownChartAxisColors(theme: 'dark' | 'light'): BurndownChartAxisColors {
  const isDark = theme === 'dark';
  const axisColor = isDark ? '#9ca3af' : '#6b7280';
  return {
    stroke: axisColor,
    tickFill: axisColor,
  };
}

export function resolveBurndownChartGridStroke(theme: 'dark' | 'light'): string {
  return theme === 'dark' ? '#374151' : '#e5e7eb';
}
