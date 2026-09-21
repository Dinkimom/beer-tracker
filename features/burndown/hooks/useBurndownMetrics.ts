/**
 * Хук для вычисления метрик берндауна (проценты выполнения, оставшиеся очки)
 */

import { useMemo } from 'react';

import {
  computeBurndownDisplayMetrics,
  type BurndownDisplayMetrics,
  type BurndownDisplayMetricsInput,
} from '../utils/burndownDisplayMetrics';

interface UseBurndownMetricsProps {
  burndownData: BurndownDisplayMetricsInput | null | undefined;
}


/**
 * Вычисляет метрики берндауна: выполненные очки и проценты выполнения.
 * См. {@link computeBurndownDisplayMetrics}.
 */
export function useBurndownMetrics({ burndownData }: UseBurndownMetricsProps): BurndownDisplayMetrics {
  return useMemo(() => computeBurndownDisplayMetrics(burndownData), [burndownData]);
}
