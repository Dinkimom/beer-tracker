/**
 * «Сделано» для реплея changelog (burndown, итоги спринта, факты метрик) — правила завершения
 * организации ({@link ../sprints/sprintTaskCompletion}), раздельно для SP и TP.
 *
 * Ограничение: в changelog есть только ключ статуса, без типа статуса трекера, поэтому
 * `defaultsByTrackerStatusType` к историческим переходам не применяется — только override по ключу,
 * `readyStatusKey` и эвристика `mapStatus` по ключу.
 */

import type { SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';

import {
  isSpCompletedStatusKey,
  isTpCompletedStatusKey,
} from '@/lib/sprints/sprintTaskCompletion';

export type BurndownCompletionRules = SprintTaskCompletionRules | null | undefined;

interface StatusDoneFlags {
  sp: boolean;
  tp: boolean;
}

export function statusDoneFlags(
  statusKey: string | undefined,
  rules: BurndownCompletionRules
): StatusDoneFlags {
  return {
    sp: isSpCompletedStatusKey(statusKey, rules),
    tp: isTpCompletedStatusKey(statusKey, rules),
  };
}

/** Что «закрылось» переходом fromKey → toKey (SP и/или TP впервые стали сделанными). */
export function statusClosingFlags(
  fromKey: string | undefined,
  toKey: string | undefined,
  rules: BurndownCompletionRules
): StatusDoneFlags {
  const to = statusDoneFlags(toKey, rules);
  const from = statusDoneFlags(fromKey, rules);
  return { sp: to.sp && !from.sp, tp: to.tp && !from.tp };
}
