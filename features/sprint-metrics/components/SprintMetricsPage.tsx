'use client';

import type { SprintMetricsSeries } from './SprintMetricsSeriesChart';

import { useMemo, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { burndownIslandClassName } from '@/features/burndown/components/burndownAreaChartHelpers';
import { useThemeStorage } from '@/hooks/useLocalStorage';
import { listFactTeams } from '@/lib/sprintMetrics/aggregateSprintMetrics';
import {
  buildQuarterRows,
  buildSprintMetricsCsv,
  buildSprintRows,
  pickQuarterComparison,
} from '@/lib/sprintMetrics/sprintMetricsView';

import { useBoardSprintMetrics } from '../hooks/useBoardSprintMetrics';
import {
  buildSprintChartRows,
  categoryColor,
  downloadCsv,
  formatMetricNumber,
  formatMetricPercent,
  formatQuarterLabel,
  neutralSeriesColor,
  seriesColor,
} from '../utils/sprintMetricsUi';

import { SprintMetricsKpiRow } from './SprintMetricsKpiRow';
import { SprintMetricsSeriesChart } from './SprintMetricsSeriesChart';
import { SprintMetricsTable } from './SprintMetricsTable';
import { SprintMetricsToolbar } from './SprintMetricsToolbar';
import { SprintMetricsWaitingCard } from './SprintMetricsWaitingCard';

const DEFAULT_QUARTERS = 4;
const PERCENT_DOMAIN: [number, number] = [0, 100];

interface SprintMetricsPageProps {
  boardId: number | null;
}

export function SprintMetricsPage({ boardId }: SprintMetricsPageProps) {
  const { t, language } = useI18n();
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
  const [theme] = useThemeStorage();
  const [quarters, setQuarters] = useState(DEFAULT_QUARTERS);
  const [team, setTeam] = useState<string | null>(null);
  const { data, error, isLoading, refetch } = useBoardSprintMetrics(boardId, quarters);

  const records = useMemo(() => data?.records ?? [], [data]);
  const teams = useMemo(() => listFactTeams(records), [records]);
  const activeTeam = team != null && teams.includes(team) ? team : null;
  const sprintRows = useMemo(() => buildSprintRows(records, activeTeam), [records, activeTeam]);
  const quarterRows = useMemo(() => buildQuarterRows(records, activeTeam), [records, activeTeam]);
  const comparison = useMemo(() => pickQuarterComparison(quarterRows), [quarterRows]);
  const openLabel = t('sprintMetrics.charts.openSprint');
  const chartRows = useMemo(() => buildSprintChartRows(sprintRows, openLabel, locale), [sprintRows, openLabel, locale]);

  const num = (value: number | null) => formatMetricNumber(value, locale);
  const pct = (value: number | null) => formatMetricPercent(value, locale);

  if (boardId == null) {
    return <p className="p-6 text-sm text-ds-text-muted">{t('sprintMetrics.states.noBoard')}</p>;
  }
  if (isLoading) {
    return <p className="p-6 text-sm text-ds-text-muted">{t('sprintMetrics.states.loading')}</p>;
  }
  if (error || !data) {
    return (
      <div className="flex items-center gap-3 p-6 text-sm text-ds-text-muted">
        {t('sprintMetrics.states.error')}
        <Button
          className="cursor-pointer px-3 py-1.5 text-xs transition-all duration-200 active:scale-[0.98]"
          variant="outline"
          onClick={() => void refetch()}
        >
          {t('sprintMetrics.actions.retry')}
        </Button>
      </div>
    );
  }

  const handleExport = () => {
    const csv = buildSprintMetricsCsv(sprintRows, {
      bugShare: t('sprintMetrics.table.bugShare'),
      carryOver: t('sprintMetrics.table.carryOver'),
      cycleP50: t('sprintMetrics.table.cycleP50'),
      cycleP85: t('sprintMetrics.table.cycleP85'),
      doneSp: t('sprintMetrics.table.doneSp'),
      flowEfficiency: t('sprintMetrics.table.flowEfficiency'),
      goals: t('sprintMetrics.table.goals'),
      quarter: t('sprintMetrics.table.quarter'),
      sayDo: t('sprintMetrics.table.sayDo'),
      scopeChange: t('sprintMetrics.table.scopeChange'),
      sprint: t('sprintMetrics.table.sprint'),
      throughput: t('sprintMetrics.table.throughput'),
    });
    const suffix = activeTeam ? `-${activeTeam}` : '';
    downloadCsv(`sprint-metrics-${boardId}${suffix}.csv`, csv);
  };

  const deliverySeries: SprintMetricsSeries[] = [
    { color: neutralSeriesColor(theme), key: 'committed', kind: 'bar', label: t('sprintMetrics.charts.deliveryCommitted') },
    { color: seriesColor(theme, 0), key: 'done', kind: 'bar', label: t('sprintMetrics.charts.deliveryDone') },
  ];
  const predictabilitySeries: SprintMetricsSeries[] = [
    { color: seriesColor(theme, 0), key: 'sayDo', kind: 'line', label: t('sprintMetrics.charts.sayDo') },
    { color: seriesColor(theme, 1), key: 'scopeChange', kind: 'line', label: t('sprintMetrics.charts.scopeChange') },
    { color: seriesColor(theme, 2), key: 'carryOver', kind: 'line', label: t('sprintMetrics.charts.carryOver') },
  ];
  const cycleSeries: SprintMetricsSeries[] = [
    { color: seriesColor(theme, 0), key: 'cycleP50', kind: 'line', label: t('sprintMetrics.charts.cycleP50') },
    { color: seriesColor(theme, 1), key: 'cycleP85', kind: 'line', label: t('sprintMetrics.charts.cycleP85') },
  ];
  const goalsSeries: SprintMetricsSeries[] = [
    { color: seriesColor(theme, 0), key: 'goals', kind: 'line', label: t('sprintMetrics.charts.goals') },
  ];
  const mixSeries: SprintMetricsSeries[] = (['feature', 'bug', 'tech', 'other'] as const).map((category) => ({
    color: categoryColor(theme, category),
    key: `mix${category[0]?.toUpperCase()}${category.slice(1)}`,
    kind: 'bar',
    label: t(`sprintMetrics.categories.${category}`),
    stackId: 'mix',
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <SprintMetricsToolbar
        canExport={sprintRows.length > 0}
        progress={data.pending > 0 ? { done: records.length, total: records.length + data.pending } : null}
        quarters={quarters}
        team={activeTeam}
        teams={teams}
        onExport={handleExport}
        onQuartersChange={setQuarters}
        onTeamChange={setTeam}
      />

      {records.length === 0 && data.pending > 0 ? null : records.length === 0 ? (
        <p className="p-6 text-sm text-ds-text-muted">{t('sprintMetrics.states.empty')}</p>
      ) : (
        <>
          <SprintMetricsKpiRow current={comparison.current} locale={locale} previous={comparison.previous} />

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <SprintMetricsSeriesChart
              data={chartRows}
              formatValue={num}
              series={deliverySeries}
              theme={theme}
              title={t('sprintMetrics.charts.delivery')}
            />
            <SprintMetricsSeriesChart
              data={chartRows}
              formatValue={pct}
              series={predictabilitySeries}
              theme={theme}
              title={t('sprintMetrics.charts.predictability')}
              yDomain={PERCENT_DOMAIN}
            />
            <SprintMetricsSeriesChart
              data={chartRows}
              formatValue={num}
              series={cycleSeries}
              theme={theme}
              title={t('sprintMetrics.charts.cycleTime')}
            />
            <SprintMetricsSeriesChart
              data={chartRows}
              formatValue={pct}
              series={mixSeries}
              theme={theme}
              title={t('sprintMetrics.charts.mix')}
              yDomain={PERCENT_DOMAIN}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <SprintMetricsSeriesChart
              data={chartRows}
              formatValue={pct}
              series={goalsSeries}
              theme={theme}
              title={t('sprintMetrics.charts.goals')}
              yDomain={PERCENT_DOMAIN}
            />
            <SprintMetricsWaitingCard
              barColor={seriesColor(theme, 0)}
              locale={locale}
              periodLabel={comparison.current ? formatQuarterLabel(comparison.current.quarter) : ''}
              waitingByStage={comparison.current?.summary?.waitingByStage ?? {}}
            />
          </div>

          <SprintMetricsTable locale={locale} quarterRows={quarterRows} sprintRows={sprintRows} />

          <details className={`${burndownIslandClassName} group text-xs text-ds-text-muted`}>
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-gray-900 transition-all duration-200 hover:bg-black/[0.03] active:scale-[0.99] active:bg-black/[0.06] dark:text-gray-100 dark:hover:bg-white/[0.04] dark:active:bg-white/[0.08] [&::-webkit-details-marker]:hidden">
              <Icon
                className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90 dark:text-gray-500"
                name="chevron-right"
              />
              {t('sprintMetrics.methodology.title')}
            </summary>
            <p className="max-w-3xl px-4 pb-4 pl-11 leading-relaxed">{t('sprintMetrics.methodology.body')}</p>
          </details>
        </>
      )}
    </div>
  );

}
