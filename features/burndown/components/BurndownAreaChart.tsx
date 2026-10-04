'use client';

import type { PointsType } from '@/types';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';

import { useI18n } from '@/contexts/LanguageContext';

import { resolveBurndownTodayAxisLabel } from '../hooks/useBurndownChartDataHelpers';

import {
  BURNDOWN_IDEAL_LINE_COLOR,
  burndownIslandClassName,
  resolveBurndownAreaChartMetricConfig,
  resolveBurndownChartAxisColors,
  resolveBurndownChartGridStroke,
  resolveBurndownYAxisTicks,
} from './burndownAreaChartHelpers';

export interface BurndownChartDataPoint {
  date: string;
  dayChangelog?: Array<{ change: number; changeTP: number; issueKey: string; remainingSP: number; remainingTP: number; summary: string; type: string }>;
  dayStartRemainingSP?: number;
  dayStartRemainingTP?: number;
  fullDate: string;
  idealSP?: number;
  idealTP?: number;
  remainingSP?: number;
  remainingTP?: number;
}

interface BurndownAreaChartProps {
  chartData: BurndownChartDataPoint[];
  /** Legend / series label for the ideal (dashed) line */
  idealSeriesName: string;
  pinnedPoint?: BurndownChartDataPoint | null;
  /** Legend / series label for remaining SP or TP */
  remainingSeriesName: string;
  theme: 'dark' | 'light';
  title: string;
  type: PointsType;
  onPointClick?: (payload: BurndownChartDataPoint, metricType: PointsType, event: React.MouseEvent) => void;
  tooltipContent: (props: TooltipProps<number, string>) => React.ReactNode;
}

function burndownPinnedRemainingValue(
  pinnedPoint: BurndownChartDataPoint | null | undefined,
  isSp: boolean
): number | undefined {
  if (pinnedPoint == null) {
    return undefined;
  }
  return isSp ? pinnedPoint.remainingSP : pinnedPoint.remainingTP;
}

export function BurndownAreaChart({
  chartData,
  pinnedPoint,
  theme,
  tooltipContent,
  type,
  title,
  idealSeriesName,
  remainingSeriesName,
  onPointClick,
}: BurndownAreaChartProps) {
  const { t } = useI18n();
  const { gradientColor, gradientId, idealDataKey, isSP, remainingDataKey } =
    resolveBurndownAreaChartMetricConfig(type);
  const { stroke: axisStroke, tickFill: axisTickFill } = resolveBurndownChartAxisColors(theme);
  const gridStroke = resolveBurndownChartGridStroke(theme);

  const pinnedY = burndownPinnedRemainingValue(pinnedPoint, isSP);
  const showPinnedDot = pinnedPoint != null && pinnedPoint.date != null && pinnedY !== undefined;
  const todayLabel = resolveBurndownTodayAxisLabel(chartData.map((point) => point.date));
  const yTicks = resolveBurndownYAxisTicks(
    chartData.flatMap((point) => (isSP ? [point.idealSP, point.remainingSP] : [point.idealTP, point.remainingTP]))
  );
  const yMax = yTicks[yTicks.length - 1] ?? 1;

  const handleDotClick = (e: React.MouseEvent, payload: BurndownChartDataPoint) => {
    e.preventDefault();
    e.stopPropagation();
    onPointClick?.(payload, type, e);
  };

  return (
    <div className={`${burndownIslandClassName} flex min-h-[220px] min-w-0 flex-1 flex-col p-4`}>
      <h3 className="sr-only">{title}</h3>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer height="100%" width="100%">
          <AreaChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor={gradientColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              stroke={axisStroke}
              tick={{ fill: axisTickFill, fontSize: 12 }}
            />
            <YAxis
              domain={[0, yMax]}
              stroke={axisStroke}
              tick={{ fill: axisTickFill, fontSize: 12 }}
              ticks={yTicks}
              width={40}
            />
            <Tooltip content={tooltipContent} />
            {todayLabel ? (
              <ReferenceLine
                label={{
                  fill: axisTickFill,
                  fontSize: 11,
                  position: 'insideTop',
                  value: t('burndown.chart.today'),
                }}
                stroke={axisStroke}
                strokeWidth={1}
                x={todayLabel}
              />
            ) : null}
            {showPinnedDot && (
              <ReferenceDot
                fill={gradientColor}
                isFront
                r={8}
                stroke={gradientColor}
                strokeWidth={2}
                x={pinnedPoint.date}
                y={pinnedY}
              />
            )}
            <Area
              dataKey={idealDataKey}
              fill="none"
              isAnimationActive={false}
              legendType="line"
              name={idealSeriesName}
              stroke={BURNDOWN_IDEAL_LINE_COLOR}
              strokeDasharray="5 5"
              strokeWidth={2}
              type="linear"
            />
            <Area
              activeDot={(props: { payload?: BurndownChartDataPoint; cx?: number; cy?: number; fill?: string; stroke?: string }) => (
                <circle
                  className="cursor-pointer"
                  cx={props.cx}
                  cy={props.cy}
                  fill={props.fill ?? gradientColor}
                  r={6}
                  stroke={props.stroke ?? gradientColor}
                  style={{ cursor: onPointClick ? 'pointer' : undefined }}
                  onClick={(e) => props.payload && handleDotClick(e, props.payload)}
                />
              )}
              dataKey={remainingDataKey}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
              name={remainingSeriesName}
              stroke={gradientColor}
              strokeWidth={3}
              type="linear"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

