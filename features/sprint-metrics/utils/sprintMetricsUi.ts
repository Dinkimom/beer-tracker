/**
 * Цвета и форматирование дашборда метрик.
 * Категориальные слоты — валидированная палитра dataviz (порядок фиксирован: blue, orange, aqua, yellow),
 * для тёмной темы — свои шаги тех же оттенков.
 */

import type { SprintMetricsChartRow } from '../components/SprintMetricsSeriesChart';
import type { SprintWorkCategory } from '@/lib/sprintMetrics/sprintMetricsTypes';
import type { SprintMetricsSprintRow } from '@/lib/sprintMetrics/sprintMetricsView';

import { workMixPercents } from '@/lib/sprintMetrics/sprintMetricsView';

type Theme = 'dark' | 'light';

const SERIES_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'] as const;
const SERIES_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500'] as const;

/** Слот категориальной палитры (0–3). */
export function seriesColor(theme: Theme, slot: 0 | 1 | 2 | 3): string {
  return (theme === 'dark' ? SERIES_DARK : SERIES_LIGHT)[slot];
}

/** Нейтральная серия («взяли на старте» — фон для «закрыли»). */
export function neutralSeriesColor(theme: Theme): string {
  return theme === 'dark' ? '#6b7280' : '#cbd5e1';
}

const CATEGORY_SLOT: Record<SprintWorkCategory, 0 | 1 | 2 | 3> = {
  bug: 1,
  feature: 0,
  other: 3,
  tech: 2,
};

export function categoryColor(theme: Theme, category: SprintWorkCategory): string {
  return seriesColor(theme, CATEGORY_SLOT[category]);
}

/** «2026-Q3» → «Q3 2026». */
export function formatQuarterLabel(quarter: string): string {
  const [year, q] = quarter.split('-');
  return q && year ? `${q} ${year}` : quarter;
}

export function formatMetricNumber(value: number | null | undefined, locale: string): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString(locale, { maximumFractionDigits: 1 });
}

export function formatMetricPercent(value: number | null | undefined, locale: string): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${formatMetricNumber(value, locale)}%`;
}

/** Строка графика по спринту: все серии дашборда в одном объекте. */
export function buildSprintChartRows(
  rows: SprintMetricsSprintRow[],
  openLabel: string,
  locale: string
): SprintMetricsChartRow[] {
  const dayMonth = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' });
  return rows.map(({ name, open, startDate, summary }) => {
    const mix = workMixPercents(summary);
    return {
      carryOver: summary.carryOverPercent,
      committed: summary.committed.sp,
      cycleP50: summary.cycleTime?.p50Days ?? null,
      cycleP85: summary.cycleTime?.p85Days ?? null,
      done: summary.done.sp,
      goals: open ? null : summary.goalsPercent,
      // Ось — дата старта (короткая и упорядоченная), полное имя — в подсказке.
      label: dayMonth.format(new Date(startDate)),
      name: open ? `${name} · ${openLabel}` : name,
      mixBug: summary.done.count > 0 ? mix.bug : null,
      mixFeature: summary.done.count > 0 ? mix.feature : null,
      mixOther: summary.done.count > 0 ? mix.other : null,
      mixTech: summary.done.count > 0 ? mix.tech : null,
      // У идущего спринта выполнение плана ещё не итог — линия не должна «проваливаться».
      sayDo: open ? null : summary.sayDoPercent,
      scopeChange: summary.scopeChangePercent,
    };
  });
}

/** Скачать текст как CSV (с BOM — чтобы Excel открыл кириллицу). */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
