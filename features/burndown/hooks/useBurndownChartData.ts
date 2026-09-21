/**
 * Хук для вычисления данных графика берндауна
 */

import type { BurndownDayChangelogItem } from '@/lib/api/types';

import { useMemo } from 'react';

import { countWorkingDays } from '../utils/dateUtils';

import {
  calculateBurndownIdealValues,
  formatBurndownChartDateLabel,
  resolveBurndownRemainingValues,
} from './useBurndownChartDataHelpers';

export type { BurndownDayChangelogItem };

interface BurndownDataPoint {
  date: string;
  dateKey?: string;
  remainingSP: number;
  remainingTP: number;
}

interface BurndownData {
  dailyChangelog?: Record<string, BurndownDayChangelogItem[]>;
  dataPoints: BurndownDataPoint[];
  initialSP: number;
  initialTP: number;
  sprintInfo: {
    endDate: string;
    startDate: string;
  };
}

interface ChartDataPoint {
  date: string;
  dayChangelog: BurndownDayChangelogItem[];
  dayStartRemainingSP: number;
  dayStartRemainingTP: number;
  fullDate: string;
  idealSP?: number;
  idealTP?: number;
  remainingSP?: number;
  remainingTP?: number;
}

interface UseBurndownChartDataProps {
  burndownData: BurndownData | null | undefined;
  isArchived: boolean;
  isDraft: boolean;
}

/**
 * Вычисляет данные для отображения на графике берндауна
 */
export function useBurndownChartData({
  burndownData,
  isArchived,
  isDraft,
}: UseBurndownChartDataProps): ChartDataPoint[] {
  return useMemo(() => {
    if (!burndownData?.dataPoints) return [];

    const startDate = new Date(burndownData.sprintInfo.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(burndownData.sprintInfo.endDate);
    endDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDataDate = isArchived ? endDate : today;

    const totalWorkingDays = countWorkingDays(startDate, endDate);

    let idealState = {
      lastWorkingDayIdealSP: burndownData.initialSP,
      lastWorkingDayIdealTP: burndownData.initialTP,
    };
    let dayStartRemainingSP = burndownData.initialSP;
    let dayStartRemainingTP = burndownData.initialTP;

    return burndownData.dataPoints.map((point) => {
      const date = new Date(point.date);
      date.setHours(0, 0, 0, 0);

      const isAfterCurrentDate = date > maxDataDate;

      const { idealSP, idealTP, nextState } = calculateBurndownIdealValues(
        date,
        burndownData.initialSP,
        burndownData.initialTP,
        startDate,
        totalWorkingDays,
        idealState
      );
      idealState = nextState;

      const { remainingSP, remainingTP } = resolveBurndownRemainingValues(
        isDraft,
        isAfterCurrentDate,
        point.remainingSP,
        point.remainingTP
      );

      const row = {
        date: formatBurndownChartDateLabel(date),
        fullDate: date.toISOString(),
        dayChangelog: burndownData.dailyChangelog?.[point.dateKey ?? point.date.slice(0, 10)] ?? [],
        dayStartRemainingSP,
        dayStartRemainingTP,
        remainingSP,
        remainingTP,
        idealSP,
        idealTP,
      };
      if (remainingSP != null) {
        dayStartRemainingSP = remainingSP;
      }
      if (remainingTP != null) {
        dayStartRemainingTP = remainingTP;
      }
      return row;
    });
  }, [burndownData, isArchived, isDraft]);
}
