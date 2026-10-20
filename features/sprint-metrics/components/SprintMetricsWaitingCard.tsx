'use client';

import type { RetroQueueStage } from '@/lib/retro/retroFacts';

import { useI18n } from '@/contexts/LanguageContext';
import { burndownIslandClassName } from '@/features/burndown/components/burndownAreaChartHelpers';
import { bottleneckStage } from '@/lib/sprintMetrics/aggregateSprintMetrics';

import { formatMetricNumber } from '../utils/sprintMetricsUi';

const STAGES: RetroQueueStage[] = ['review', 'readyForTest', 'testing', 'readyForDeploy'];

interface SprintMetricsWaitingCardProps {
  barColor: string;
  locale: string;
  periodLabel: string;
  waitingByStage: Partial<Record<RetroQueueStage, number>>;
}

/** Среднее ожидание на задачу по стадиям за период; самая долгая стадия подписана. */
export function SprintMetricsWaitingCard({ barColor, locale, periodLabel, waitingByStage }: SprintMetricsWaitingCardProps) {
  const { t } = useI18n();
  const max = Math.max(0, ...STAGES.map((stage) => waitingByStage[stage] ?? 0));
  const bottleneck = bottleneckStage(waitingByStage);

  return (
    <section className={`${burndownIslandClassName} flex min-w-0 flex-col gap-3 p-4`}>
      <div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('sprintMetrics.charts.waiting')}</h3>
        <p className="text-xs text-ds-text-muted">
          {t('sprintMetrics.charts.waitingCaption', { period: periodLabel })}
        </p>
      </div>
      {max <= 0 ? (
        <p className="text-sm text-ds-text-muted">{t('sprintMetrics.charts.waitingEmpty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {STAGES.map((stage) => {
            const days = waitingByStage[stage] ?? 0;
            return (
              <li key={stage} className="grid max-w-2xl grid-cols-[9rem_minmax(0,1fr)_3rem] items-center gap-2 text-xs">
                <span className={stage === bottleneck ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-ds-text-muted'}>
                  {t(`sprintMetrics.stages.${stage}`)}
                </span>
                <span className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <span
                    className="block h-full rounded-full"
                    style={{ backgroundColor: barColor, width: `${(100 * days) / max}%` }}
                  />
                </span>
                <span className="text-right tabular-nums text-gray-900 dark:text-gray-100">
                  {formatMetricNumber(days, locale)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
