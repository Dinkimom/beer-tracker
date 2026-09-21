/**
 * Карточки SP/TP из реплея changelog (если в UI не подставлены итоги по задачам — см. {@link computeBurndownTilesFromTasks}).
 */

import type { SprintTimelineTotals } from '@/lib/burndown/taskChangelogTimeline';

export interface BurndownDisplayMetricsInput {
  sprintTimelineTotals: SprintTimelineTotals | null | undefined;
}

export interface BurndownDisplayMetrics {
  completedSP: number;
  completedTP: number;
  completionPercentSP: number;
  completionPercentTP: number;
  /** Знаменатель для «X / Y» — total из реплея */
  totalScopeSP: number;
  totalScopeTP: number;
}

export function computeBurndownDisplayMetrics(
  burndownData: BurndownDisplayMetricsInput | null | undefined
): BurndownDisplayMetrics {
  const t = burndownData?.sprintTimelineTotals;
  if (!t) {
    return {
      completedSP: 0,
      completedTP: 0,
      completionPercentSP: 0,
      completionPercentTP: 0,
      totalScopeSP: 0,
      totalScopeTP: 0,
    };
  }

  const completionPercentSP =
    t.totalSP === 0 ? 0 : Math.min(100, Math.max(0, Math.round((t.doneSP / t.totalSP) * 100)));
  const completionPercentTP =
    t.totalTP === 0 ? 0 : Math.min(100, Math.max(0, Math.round((t.doneTP / t.totalTP) * 100)));

  return {
    completedSP: t.doneSP,
    completedTP: t.doneTP,
    totalScopeSP: t.totalSP,
    totalScopeTP: t.totalTP,
    completionPercentSP,
    completionPercentTP,
  };
}
