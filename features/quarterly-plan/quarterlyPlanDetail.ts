/**
 * Детализация квартальной доски (docs/QUARTERLY_PLAN_RULES.md, раздел 14): три уровня — роадмэп, план, детали.
 * Чистые правила уровня; состояние — `useQuarterDetail`.
 */

import type { QuarterlyPlanAssignment, QuarterlyPlanPhase } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { assignBarLanes, assignmentPhase, daySpanOf, type NoteLaneBlocker } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { QUARTER_WORKING_DAYS_PER_WEEK } from '@/lib/quarterlyPlans/quarterWeeks';

import { QUARTER_WEEK_MIN_WIDTH_PX } from './quarterlyPlanBoardModel';

/** Роадмэп — что и когда поставляем; план — кто на чём по неделям; детали — как эпик идёт по дням и задачам. */
export type QuarterDetailLevel = 'details' | 'plan' | 'roadmap';

/** От общего к подробному — порядок кнопок переключателя. */
export const QUARTER_DETAIL_LEVELS: readonly QuarterDetailLevel[] = ['roadmap', 'plan', 'details'];

export function parseQuarterDetailLevel(value: unknown): QuarterDetailLevel {
  return QUARTER_DETAIL_LEVELS.find((level) => level === value) ?? 'plan';
}

/**
 * Наименьшая ширина недели (QZ2): роадмэп вписывает квартал в экран, план — как раньше, в деталях неделя
 * такая, что читается каждый день.
 */
export const QUARTER_WEEK_MIN_WIDTH_BY_DETAIL: Record<QuarterDetailLevel, number> = {
  details: 320,
  plan: QUARTER_WEEK_MIN_WIDTH_PX,
  roadmap: 56,
};

/** Сводная полоса фазы в строке роадмэпа: общий срок всех полос этой фазы и кто ей занят. */
export interface QuarterPhaseRollup {
  days: number;
  lane: number;
  /** Люди фазы без повторов, в порядке начала их полос — аватары на сводной полосе. */
  memberIds: string[];
  phase: QuarterlyPlanPhase;
  startDay: number;
}

const PHASE_ORDER: readonly QuarterlyPlanPhase[] = ['discovery', 'delivery'];

/**
 * Сводные полосы строки роадмэпа (QZ3): по одной на фазу — от самого раннего начала до самого позднего конца
 * её полос, округлённый до целых недель, с людьми этой фазы. Проработка и поставка пересекаются — встают в две дорожки, идут подряд — в одну.
 */
export function rollupPhases(assignments: readonly QuarterlyPlanAssignment[]): {
  laneCount: number;
  rollups: QuarterPhaseRollup[];
} {
  const spans = PHASE_ORDER.flatMap((phase) => {
    const own = assignments
      .filter((assignment) => assignmentPhase(assignment) === phase)
      .map((assignment) => ({ ...daySpanOf(assignment), memberId: assignment.memberId }))
      .sort((a, b) => a.startDay - b.startDay);
    if (own.length === 0) return [];
    // Роадмэп считает неделями: срок округляется до целых недель, даже если полоса задевает неделю одним днём.
    const startDay = Math.floor(own[0]!.startDay / QUARTER_WORKING_DAYS_PER_WEEK) * QUARTER_WORKING_DAYS_PER_WEEK;
    const endDay = Math.max(...own.map((span) => span.startDay + span.days));
    const days = Math.ceil(endDay / QUARTER_WORKING_DAYS_PER_WEEK) * QUARTER_WORKING_DAYS_PER_WEEK - startDay;
    return [{ days, memberIds: [...new Set(own.map((span) => span.memberId))], phase, startDay }];
  });
  const { laneById, laneCount } = assignBarLanes(
    spans.map((span) => ({
      id: span.phase,
      startWeek: span.startDay / QUARTER_WORKING_DAYS_PER_WEEK,
      weeks: span.days / QUARTER_WORKING_DAYS_PER_WEEK,
    }))
  );
  return { laneCount, rollups: spans.map((span) => ({ ...span, lane: laneById.get(span.phase) ?? 0 })) };
}

/** Место сводных полос в дорожках строки: цели встают над ними, как над полосами плана (QG8). */
export function rollupNoteBlockers(rollups: readonly QuarterPhaseRollup[]): NoteLaneBlocker[] {
  return rollups.map((rollup) => ({
    lane: rollup.lane,
    rows: 1,
    startWeek: rollup.startDay / QUARTER_WORKING_DAYS_PER_WEEK,
    weeks: rollup.days / QUARTER_WORKING_DAYS_PER_WEEK,
  }));
}
