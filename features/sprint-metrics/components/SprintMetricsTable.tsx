'use client';

import type { SprintMetricsSummary } from '@/lib/sprintMetrics/sprintMetricsTypes';
import type { SprintMetricsQuarterRow, SprintMetricsSprintRow } from '@/lib/sprintMetrics/sprintMetricsView';

import { useState } from 'react';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import { burndownIslandClassName } from '@/features/burndown/components/burndownAreaChartHelpers';
import { bugSharePercent } from '@/lib/sprintMetrics/sprintMetricsView';

import { formatMetricNumber, formatMetricPercent, formatQuarterLabel } from '../utils/sprintMetricsUi';

interface SprintMetricsTableProps {
  locale: string;
  quarterRows: SprintMetricsQuarterRow[];
  sprintRows: SprintMetricsSprintRow[];
}

interface TableRow {
  key: string;
  label: string;
  muted: boolean;
  /** Скорость за спринт (кварталы) или закрыто SP (спринт). */
  points: number | null;
  sprintCount: number | null;
  summary: SprintMetricsSummary | null;
  throughput: number | null;
}

const CELL = 'whitespace-nowrap px-3 py-2 text-right tabular-nums';
const HEAD = 'whitespace-nowrap px-3 py-2 text-right font-medium';

function quarterTableRows(rows: SprintMetricsQuarterRow[], openLabel: string): TableRow[] {
  return rows.map((row) => ({
    key: row.quarter,
    label: `${formatQuarterLabel(row.quarter)}${row.hasOpenSprint ? ` (${openLabel})` : ''}`,
    muted: row.summary == null,
    points: row.summary?.velocityPerSprint ?? null,
    sprintCount: row.summary?.sprintCount ?? null,
    summary: row.summary,
    throughput: row.summary?.throughputPerSprint ?? null,
  }));
}

function sprintTableRows(rows: SprintMetricsSprintRow[], openLabel: string): TableRow[] {
  return [...rows].reverse().map((row) => ({
    key: String(row.id),
    label: row.open ? `${row.name} (${openLabel})` : row.name,
    muted: row.open,
    points: row.summary.done.sp,
    sprintCount: null,
    summary: row.summary,
    throughput: row.summary.done.count,
  }));
}

export function SprintMetricsTable({ locale, quarterRows, sprintRows }: SprintMetricsTableProps) {
  const { t } = useI18n();
  const [showSprints, setShowSprints] = useState(false);
  const openLabel = t('sprintMetrics.table.open');
  const rows = showSprints ? sprintTableRows(sprintRows, openLabel) : quarterTableRows(quarterRows, openLabel);
  const num = (value: number | null | undefined) => formatMetricNumber(value, locale);
  const pct = (value: number | null | undefined) => formatMetricPercent(value, locale);
  // Cycle time — всегда с десятыми, чтобы столбец читался ровно.
  const days = (value: number | null | undefined) =>
    value == null ? '—' : value.toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 });

  return (
    <section className={`${burndownIslandClassName} flex min-w-0 flex-col gap-3 p-4`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {showSprints ? t('sprintMetrics.table.sprintsTitle') : t('sprintMetrics.table.title')}
        </h3>
        <div aria-label={t('sprintMetrics.table.title')} className="flex shrink-0 gap-1" role="group">
          {([false, true] as const).map((sprints) => (
            <Button
              key={String(sprints)}
              aria-pressed={showSprints === sprints}
              className="!h-8 !px-2.5 !py-0 cursor-pointer text-xs transition-all duration-200 active:scale-[0.98]"
              type="button"
              variant={showSprints === sprints ? 'accent' : 'outline'}
              onClick={() => setShowSprints(sprints)}
            >
              {sprints ? t('sprintMetrics.table.sprintsView') : t('sprintMetrics.table.quartersView')}
            </Button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-ds-text-muted">
            <tr className="border-b border-ds-border-subtle">
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium">
                {showSprints ? t('sprintMetrics.table.sprint') : t('sprintMetrics.table.quarter')}
              </th>
              {showSprints ? null : <th className={HEAD}>{t('sprintMetrics.table.sprints')}</th>}
              <th className={HEAD}>{showSprints ? t('sprintMetrics.table.doneSp') : t('sprintMetrics.table.velocity')}</th>
              <th className={HEAD}>{t('sprintMetrics.table.throughput')}</th>
              <th className={HEAD}>{t('sprintMetrics.table.sayDo')}</th>
              <th className={HEAD}>{t('sprintMetrics.table.scopeChange')}</th>
              <th className={HEAD}>{t('sprintMetrics.table.carryOver')}</th>
              <th className={HEAD}>{t('sprintMetrics.table.cycleP50')}</th>
              <th className={HEAD}>{t('sprintMetrics.table.cycleP85')}</th>
              <th className={HEAD}>{t('sprintMetrics.table.flowEfficiency')}</th>
              <th className={HEAD}>{t('sprintMetrics.table.goals')}</th>
              <th className={HEAD}>{t('sprintMetrics.table.bugShare')}</th>
            </tr>
          </thead>
          <tbody className="text-gray-900 dark:text-gray-100">
            {rows.map((row) => (
              <tr
                key={row.key}
                className={`border-b border-ds-border-subtle last:border-0 ${row.muted ? 'text-ds-text-muted' : ''}`}
              >
                <td className="whitespace-nowrap px-3 py-2 text-left">{row.label}</td>
                {showSprints ? null : <td className={CELL}>{num(row.sprintCount)}</td>}
                <td className={CELL}>{num(row.points)}</td>
                <td className={CELL}>{num(row.throughput)}</td>
                <td className={CELL}>{pct(row.summary?.sayDoPercent)}</td>
                <td className={CELL}>{pct(row.summary?.scopeChangePercent)}</td>
                <td className={CELL}>{pct(row.summary?.carryOverPercent)}</td>
                <td className={CELL}>{days(row.summary?.cycleTime?.p50Days)}</td>
                <td className={CELL}>{days(row.summary?.cycleTime?.p85Days)}</td>
                <td className={CELL}>{pct(row.summary?.flowEfficiencyPercent)}</td>
                <td className={CELL}>{pct(row.summary?.goalsPercent)}</td>
                <td className={CELL}>{pct(row.summary ? bugSharePercent(row.summary) : null)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
