/**
 * «Сделано» для реплея changelog (burndown, итоги спринта, факты метрик) — правила завершения
 * организации ({@link ../sprints/sprintTaskCompletion}), раздельно для SP и TP.
 *
 * В changelog нет типа статуса, поэтому тип ищется в справочнике трекера: сначала по id статуса,
 * затем по ключу. Статус, которого нет в справочнике, «сделанным» не считается.
 */

import type { SprintTaskCompletionRules, StatusRef } from '@/lib/sprints/sprintTaskCompletion';

import { isStatusKeyCompleted } from '@/lib/sprints/sprintTaskCompletion';

export type BurndownCompletionRules = SprintTaskCompletionRules | null | undefined;

interface StatusDoneFlags {
  sp: boolean;
  tp: boolean;
}

export function statusDoneFlags(
  status: StatusRef,
  rules: BurndownCompletionRules
): StatusDoneFlags {
  return {
    sp: isStatusKeyCompleted(status, rules),
    tp: isStatusKeyCompleted(status, rules),
  };
}

/** Что «закрылось» переходом from → to (SP и/или TP впервые стали сделанными). */
export function statusClosingFlags(
  fromStatus: StatusRef,
  toStatus: StatusRef,
  rules: BurndownCompletionRules
): StatusDoneFlags {
  const to = statusDoneFlags(toStatus, rules);
  const from = statusDoneFlags(fromStatus, rules);
  return { sp: to.sp && !from.sp, tp: to.tp && !from.tp };
}
