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

/** Поверхность острова на холсте страницы сгорания. */
export const burndownIslandClassName =
  'rounded-2xl border border-ds-border-subtle bg-ds-surface-header';

/** blue-600: полоса плитки и линия остатка SP. */
export const BURNDOWN_SP_COLOR = '#2563eb';

/** amber-600: полоса плитки и линия остатка TP. */
export const BURNDOWN_TP_COLOR = '#d97706';

/** Пунктир плановой сходимости. */
export const BURNDOWN_IDEAL_LINE_COLOR = '#94a3b8';

export function resolveBurndownAreaChartMetricConfig(type: PointsType): BurndownAreaChartMetricConfig {
  const isSP = type === 'SP';
  return {
    isSP,
    gradientId: isSP ? 'colorSP' : 'colorTP',
    gradientColor: isSP ? BURNDOWN_SP_COLOR : BURNDOWN_TP_COLOR,
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

function niceBurndownAxisStep(max: number): number {
  const roughStep = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const residual = roughStep / magnitude;
  if (residual <= 1) {
    return magnitude;
  }
  if (residual <= 2) {
    return 2 * magnitude;
  }
  if (residual <= 5) {
    return 5 * magnitude;
  }
  return 10 * magnitude;
}

/** Деления оси Y от нуля: цель сгорания остаётся подписанной. */
export function resolveBurndownYAxisTicks(
  values: readonly (number | null | undefined)[]
): number[] {
  const max = values.reduce<number>((peak, value) => {
    if (value == null || !Number.isFinite(value)) {
      return peak;
    }
    return Math.max(peak, value);
  }, 0);
  if (max <= 0) {
    return [0, 1];
  }
  const step = niceBurndownAxisStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top + step / 1000; value += step) {
    ticks.push(Number(value.toFixed(6)));
  }
  return ticks;
}
