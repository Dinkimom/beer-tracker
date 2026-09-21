'use client';

import type { BurndownDayChangelogItem, MetricType, TranslateFn } from './burndownChartTooltipContext';
import type { TooltipProps } from 'recharts';

import {
  resolveBurndownTooltipDateLabel,
  resolveBurndownTooltipDayChangelog,
} from './burndownChartCustomTooltipHelpers';
import { BurndownChartTooltipChangelogSection } from './BurndownChartTooltipChangelogSection';
import {
  filterBurndownDayChangelog,
  resolveBurndownMetricValues,
  resolveBurndownTooltipTheme,
} from './burndownChartTooltipHelpers';
import { BurndownChartTooltipMetricsRow } from './BurndownChartTooltipMetricsRow';

export function BurndownChartCustomTooltip({
  active,
  payload,
  theme,
  metricType = 'SP',
  t,
  locale,
  changelogTypeLabels,
}: TooltipProps<number, string> & {
  theme: 'dark' | 'light';
  metricType?: MetricType;
  t: TranslateFn;
  locale: string;
  changelogTypeLabels: Record<string, string>;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload as {
    date?: string;
    fullDate?: string;
    dayChangelog?: BurndownDayChangelogItem[];
    remainingSP?: number;
    idealSP?: number;
    remainingTP?: number;
    idealTP?: number;
  } | undefined;

  const { bgColor, borderColor, mutedColor, textColor } = resolveBurndownTooltipTheme(theme);
  const isDark = theme === 'dark';

  const dateLabel = resolveBurndownTooltipDateLabel(point, locale);

  const { factColor, factValue, isTP, metricLabel, planValue } = resolveBurndownMetricValues(metricType, point);

  const dayChangelog = resolveBurndownTooltipDayChangelog(point, isTP, filterBurndownDayChangelog);
  const showChangelogSection = factValue !== undefined;
  const dash = '—';

  return (
    <div
      className="cursor-default"
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '10px 12px',
        color: textColor,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        maxWidth: 420,
      }}
    >
      <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
        {dateLabel}
      </div>
      <BurndownChartTooltipMetricsRow
        dash={dash}
        factColor={factColor}
        factValue={factValue}
        metricLabel={metricLabel}
        mutedColor={mutedColor}
        planValue={planValue}
        showChangelogSection={showChangelogSection}
        t={t}
      />
      {showChangelogSection ? (
        <BurndownChartTooltipChangelogSection
          bgColor={bgColor}
          borderColor={borderColor}
          changeHeader={t('burndown.changelog.changeColumn')}
          changelogTypeLabels={changelogTypeLabels}
          dayChangelog={dayChangelog}
          isDark={isDark}
          isTP={isTP}
          mutedColor={mutedColor}
          noChangesLabel={t('burndown.changelog.noChanges')}
          remainingHeader={t('burndown.changelog.remainingColumn')}
        />
      ) : null}
    </div>
  );
}
