'use client';

import type { SprintMetricsKpiKey, SprintMetricsQuarterRow } from '@/lib/sprintMetrics/sprintMetricsView';

import { useI18n } from '@/contexts/LanguageContext';
import { kpiTrend, kpiValue, SPRINT_METRICS_KPI_KEYS } from '@/lib/sprintMetrics/sprintMetricsView';

import { formatMetricNumber, formatMetricPercent, formatQuarterLabel } from '../utils/sprintMetricsUi';

import { SprintMetricsKpiTile } from './SprintMetricsKpiTile';

type KpiUnit = 'days' | 'percent' | 'points';

const KPI_UNIT: Record<SprintMetricsKpiKey, KpiUnit> = {
  bugShare: 'percent',
  carryOver: 'percent',
  cycleTime: 'days',
  sayDo: 'percent',
  velocity: 'points',
};

interface SprintMetricsKpiRowProps {
  current: SprintMetricsQuarterRow | null;
  locale: string;
  previous: SprintMetricsQuarterRow | null;
}

function formatSigned(value: number, locale: string): string {
  let sign = '';
  if (value > 0) sign = '+';
  if (value < 0) sign = '−';
  return `${sign}${formatMetricNumber(Math.abs(value), locale)}`;
}

/** Последний квартал с закончившимися спринтами против предыдущего. */
export function SprintMetricsKpiRow({ current, locale, previous }: SprintMetricsKpiRowProps) {
  const { t } = useI18n();
  const unitSuffix: Record<KpiUnit, string> = {
    days: ` ${t('sprintMetrics.kpi.daysUnit')}`,
    percent: ` ${t('sprintMetrics.kpi.pp')}`,
    points: ' SP',
  };
  const currentLabel = current ? formatQuarterLabel(current.quarter) : '';
  const caption = previous
    ? t('sprintMetrics.kpi.caption', { current: currentLabel, previous: formatQuarterLabel(previous.quarter) })
    : t('sprintMetrics.kpi.captionNoPrevious', { current: currentLabel });

  const unitLabel: Record<KpiUnit, string | undefined> = {
    days: t('sprintMetrics.kpi.daysUnit'),
    percent: undefined,
    points: t('sprintMetrics.kpi.velocityUnit'),
  };
  const formatValue = (key: SprintMetricsKpiKey, value: number | null): string => {
    if (value == null) return '—';
    return KPI_UNIT[key] === 'percent' ? formatMetricPercent(value, locale) : formatMetricNumber(value, locale);
  };

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-ds-text-muted">{caption}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {SPRINT_METRICS_KPI_KEYS.map((key) => {
        const value = kpiValue(current?.summary ?? null, key);
        const change = kpiTrend(key, value, kpiValue(previous?.summary ?? null, key));
        return (
          <SprintMetricsKpiTile
            key={key}
            deltaLabel={change ? `${formatSigned(change.delta, locale)}${unitSuffix[KPI_UNIT[key]]}` : null}
            hint={t(`sprintMetrics.kpi.${key}Hint`)}
            title={t(`sprintMetrics.kpi.${key}`)}
            trend={change?.trend ?? null}
            unit={value == null ? undefined : unitLabel[KPI_UNIT[key]]}
            value={formatValue(key, value)}
          />
        );
      })}
      </div>
    </section>
  );
}
