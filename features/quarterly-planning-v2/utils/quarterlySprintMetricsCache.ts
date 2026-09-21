import type { QuarterlySprintInfo } from '../types';

/** Активный спринт: короткий staleTime, метрики могут меняться. */
const QUARTERLY_SPRINT_METRICS_STALE_ACTIVE_MS = 2 * 60 * 1000;
const QUARTERLY_SPRINT_METRICS_GC_ACTIVE_MS = 10 * 60 * 1000;

/** Завершённый/архивный спринт: не перезапрашиваем без invalidate. */
export const QUARTERLY_SPRINT_METRICS_STALE_FROZEN_MS = Number.POSITIVE_INFINITY;
const QUARTERLY_SPRINT_METRICS_GC_FROZEN_MS = 24 * 60 * 60 * 1000;

export function parseQuarterlySprintId(sprint: Pick<QuarterlySprintInfo, 'id'>): number {
  const id = typeof sprint.id === 'number' ? sprint.id : Number.parseInt(String(sprint.id), 10);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

/**
 * Метрики спринта (цели, score) для квартального планера не пересчитываем на клиенте,
 * если спринт архивирован, released или уже закончился по календарю.
 */
export function isFrozenQuarterlySprintMetrics(
  sprint: Pick<QuarterlySprintInfo, 'archived' | 'endDate' | 'status'>
): boolean {
  if (sprint.archived) return true;
  const status = (sprint.status ?? '').trim().toLowerCase();
  if (status === 'archived' || status === 'released') return true;

  if (sprint.endDate) {
    const end = new Date(sprint.endDate);
    end.setHours(23, 59, 59, 999);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (end < today) return true;
  }

  return false;
}

export function quarterlySprintMetricsQueryOptions(frozen: boolean): {
  gcTime: number;
  staleTime: number;
} {
  return frozen
    ? {
        staleTime: QUARTERLY_SPRINT_METRICS_STALE_FROZEN_MS,
        gcTime: QUARTERLY_SPRINT_METRICS_GC_FROZEN_MS,
      }
    : {
        staleTime: QUARTERLY_SPRINT_METRICS_STALE_ACTIVE_MS,
        gcTime: QUARTERLY_SPRINT_METRICS_GC_ACTIVE_MS,
      };
}
