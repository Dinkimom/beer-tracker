'use client';

import { useI18n } from '@/contexts/LanguageContext';

import {
  BURNDOWN_IDEAL_LINE_COLOR,
  BURNDOWN_SP_COLOR,
  BURNDOWN_TP_COLOR,
} from './burndownAreaChartHelpers';

/** Одна легенда на страницу: план и остаток. Имя метрики остаётся на плитке. */
export function BurndownChartSeriesLegend({ hideTpInBurndown }: { hideTpInBurndown: boolean }) {
  const { t } = useI18n();
  const items = [
    { color: BURNDOWN_IDEAL_LINE_COLOR, dashed: true, label: t('burndown.chart.idealLine') },
    { color: BURNDOWN_SP_COLOR, dashed: false, label: t('burndown.chart.remainingSp') },
    ...(hideTpInBurndown
      ? []
      : [{ color: BURNDOWN_TP_COLOR, dashed: false, label: t('burndown.chart.remainingTp') }]),
  ];

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ds-text-muted">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          {item.dashed ? (
            <span
              aria-hidden
              className="inline-block w-4 border-t-2 border-dashed"
              style={{ borderColor: item.color }}
            />
          ) : (
            <span
              aria-hidden
              className="inline-block h-0.5 w-4 rounded-full"
              style={{ backgroundColor: item.color }}
            />
          )}
          {item.label}
        </span>
      ))}
    </div>
  );
}
