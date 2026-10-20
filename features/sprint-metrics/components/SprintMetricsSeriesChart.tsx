'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  burndownIslandClassName,
  resolveBurndownChartAxisColors,
  resolveBurndownChartGridStroke,
} from '@/features/burndown/components/burndownAreaChartHelpers';

import { SprintMetricsChartTooltip } from './SprintMetricsChartTooltip';

export interface SprintMetricsSeries {
  color: string;
  key: string;
  kind: 'bar' | 'line';
  label: string;
  stackId?: string;
}

/** `label` — подпись оси (дата старта), `name` — полное имя спринта для подсказки. */
export type SprintMetricsChartRow = Record<string, number | string | null> & { label: string; name: string };

interface SprintMetricsSeriesChartProps {
  data: SprintMetricsChartRow[];
  series: SprintMetricsSeries[];
  theme: 'dark' | 'light';
  title: string;
  /** Для процентов — фиксированная шкала 0–100. */
  yDomain?: [number, number];
  formatValue: (value: number | null) => string;
}

const PERCENT_TICKS = [0, 25, 50, 75, 100];

/** Цвет поверхности острова (--ds-surface-header): зазор между сегментами стека. */
function surfaceColor(theme: 'dark' | 'light'): string {
  return theme === 'dark' ? '#1f2937' : '#ffffff';
}

/** Одна мера на одной оси по спринтам: линии и/или столбцы, легенда сверху при двух и более сериях. */
export function SprintMetricsSeriesChart({
  data,
  formatValue,
  series,
  theme,
  title,
  yDomain,
}: SprintMetricsSeriesChartProps) {
  const { stroke: axisStroke, tickFill } = resolveBurndownChartAxisColors(theme);
  const gridStroke = resolveBurndownChartGridStroke(theme);

  return (
    <section className={`${burndownIslandClassName} flex min-w-0 flex-col gap-2 p-4`}>
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</h3>
      {series.length > 1 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ds-text-muted">
          {series.map((item) => (
            <span key={item.key} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className={item.kind === 'line' ? 'inline-block h-0.5 w-4 rounded-full' : 'inline-block h-2.5 w-2.5 rounded-sm'}
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
      <div className="h-56">
        <ResponsiveContainer height="100%" width="100%">
          <ComposedChart barGap={2} data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              interval="preserveStartEnd"
              minTickGap={16}
              stroke={axisStroke}
              tick={{ fill: tickFill, fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              domain={yDomain ?? [0, 'auto']}
              stroke={axisStroke}
              tick={{ fill: tickFill, fontSize: 11 }}
              tickFormatter={(value: number) => formatValue(value)}
              tickLine={false}
              ticks={yDomain ? PERCENT_TICKS : undefined}
              width={44}
            />
            <Tooltip
              content={({ active, payload }) => (
                <SprintMetricsChartTooltip
                  active={active}
                  formatValue={formatValue}
                  label={(payload?.[0]?.payload as SprintMetricsChartRow | undefined)?.name}
                  payload={payload}
                />
              )}
              cursor={{ fill: gridStroke, opacity: 0.4 }}
            />
            {series.map((item) =>
              item.kind === 'bar' ? (
                <Bar
                  key={item.key}
                  dataKey={item.key}
                  fill={item.color}
                  isAnimationActive={false}
                  maxBarSize={28}
                  name={item.label}
                  radius={item.stackId ? 0 : [4, 4, 0, 0]}
                  stackId={item.stackId}
                  stroke={item.stackId ? surfaceColor(theme) : undefined}
                  strokeWidth={item.stackId ? 1 : 0}
                />
              ) : (
                <Line
                  key={item.key}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                  dataKey={item.key}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                  name={item.label}
                  stroke={item.color}
                  strokeWidth={2}
                  type="linear"
                />
              )
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
