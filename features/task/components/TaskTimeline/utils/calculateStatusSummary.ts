/**
 * Утилита для вычисления сводки по статусам
 */

import type { StatusDuration, StatusSummary } from '../types';

const RELEVANT_STATUSES = ['inprogress', 'intesting'];

export function calculateStatusSummary(statusDurations: StatusDuration[]): StatusSummary[] {
  // Суммируем время по статусам (если задача возвращалась в один статус несколько раз)
  // Фильтруем только нужные статусы
  const statusSummaryMap = new Map<string, StatusSummary>();

  statusDurations.forEach((status) => {
    // Фильтруем только inProgress и inTesting
    const statusKeyLower = status.statusKey.toLowerCase();
    if (!RELEVANT_STATUSES.includes(statusKeyLower)) {
      return;
    }

    const existing = statusSummaryMap.get(status.statusKey);
    if (existing) {
      existing.totalDurationMs += status.durationMs;
      existing.count += 1;
    } else {
      statusSummaryMap.set(status.statusKey, {
        statusKey: status.statusKey,
        statusName: status.statusName,
        totalDurationMs: status.durationMs,
        count: 1,
      });
    }
  });

  // Сортируем по времени (от большего к меньшему)
  return Array.from(statusSummaryMap.values())
    .sort((a, b) => b.totalDurationMs - a.totalDurationMs);
}

