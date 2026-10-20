'use client';

import type { KpiTrend } from '@/lib/sprintMetrics/sprintMetricsView';

import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { burndownIslandClassName } from '@/features/burndown/components/burndownAreaChartHelpers';

interface SprintMetricsKpiTileProps {
  /** Изменение к прошлому кварталу, уже отформатированное со знаком. */
  deltaLabel: string | null;
  hint: string;
  title: string;
  trend: KpiTrend | null;
  /** Единица рядом с числом (SP/спринт, дн.) — мельче и приглушённо. */
  unit?: string;
  value: string;
}

const TREND_CLASS: Record<KpiTrend, string> = {
  better: 'text-green-700 dark:text-green-400',
  same: 'text-ds-text-muted',
  worse: 'text-red-700 dark:text-red-400',
};

const TREND_ICON: Record<KpiTrend, string> = {
  better: 'check-circle',
  same: 'minus',
  worse: 'alert-triangle',
};

export function SprintMetricsKpiTile({ deltaLabel, hint, title, trend, unit, value }: SprintMetricsKpiTileProps) {
  const { t } = useI18n();
  return (
    <div className={`${burndownIslandClassName} flex min-w-0 flex-col gap-1 p-4`}>
      <TextTooltip content={hint}>
        <h3 className="inline-flex w-fit items-center gap-1 text-sm font-medium text-ds-text-muted">
          {title}
          <Icon className="h-3.5 w-3.5" name="circle-info" />
        </h3>
      </TextTooltip>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100">{value}</span>
        {unit ? <span className="text-sm font-medium text-ds-text-muted">{unit}</span> : null}
      </div>
      {trend && deltaLabel ? (
        <div className={`inline-flex items-center gap-1 text-xs font-medium ${TREND_CLASS[trend]}`}>
          <Icon className="h-3.5 w-3.5" name={TREND_ICON[trend]} />
          <span className="tabular-nums">{deltaLabel}</span>
          <span>· {t(`sprintMetrics.kpi.${trend}`)}</span>
        </div>
      ) : null}
    </div>
  );
}
