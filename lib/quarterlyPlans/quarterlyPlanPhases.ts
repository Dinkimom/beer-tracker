/**
 * Сроки фаз строк квартального плана (QG3) и сигнал «проработано, не разбито» (QG4) —
 * раздел 13 docs/QUARTERLY_PLAN_RULES.md. Чистые функции: одна реализация для доски и агентов.
 */

import type {
  QuarterlyPlan,
  QuarterlyPlanAssignment,
  QuarterlyPlanContent,
  QuarterlyPlanPhase,
  QuarterlyPlanSprint,
} from './quarterlyPlanTypes';
import type { QuarterWeek } from './quarterWeeks';

import { assignmentPhase } from './quarterlyPlanLayout';

/** Строка плана, у которой есть срок: эпик или направление. */
interface PlanRowRef {
  id: string;
  kind: 'direction' | 'epic';
}

/** Срок фазы строки: неделя конца последней полосы и спринт, с которым сравнивается факт. */
interface PhaseDeadline {
  /** Когда срок проходит: конец срочного спринта, а без спринта — пятница недели срока. ISO date-only. */
  endDate: string;
  /** Срочный спринт; null — на неделю срока и после неё спринтов у команды нет. */
  sprint: QuarterlyPlanSprint | null;
  week: number;
}

function dayOf(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}

/**
 * Полосы, по которым считается срок фазы строки. У направления delivery — свои полосы и полосы
 * его эпиков; discovery — только свои: проработка эпика относится к эпику.
 */
function phaseAssignmentsOfRow(
  plan: Pick<QuarterlyPlanContent, 'assignments' | 'epics'>,
  row: PlanRowRef,
  phase: QuarterlyPlanPhase
): QuarterlyPlanAssignment[] {
  const ofPhase = plan.assignments.filter((assignment) => assignmentPhase(assignment) === phase);
  if (row.kind === 'epic') return ofPhase.filter((assignment) => assignment.epicId === row.id);
  const epicIds = new Set(
    phase === 'delivery' ? plan.epics.filter((epic) => epic.directionId === row.id).map((epic) => epic.id) : []
  );
  return ofPhase.filter(
    (assignment) =>
      assignment.directionId === row.id || (assignment.epicId !== undefined && epicIds.has(assignment.epicId))
  );
}

/**
 * Срочный спринт недели (QG3): спринт команды, который задевает неделю (из нескольких — тот, что
 * кончается позже), иначе ближайший следующий; null — таких спринтов нет.
 */
export function deadlineSprintOfWeek(
  sprints: readonly QuarterlyPlanSprint[],
  week: Pick<QuarterWeek, 'endDate' | 'startDate'>
): QuarterlyPlanSprint | null {
  const byEnd = [...sprints].sort((a, b) => dayOf(a.endDate).localeCompare(dayOf(b.endDate)));
  const touching = byEnd.filter(
    (sprint) => dayOf(sprint.startDate) <= week.endDate && dayOf(sprint.endDate) >= week.startDate
  );
  return touching.at(-1) ?? byEnd.find((sprint) => dayOf(sprint.startDate) > week.endDate) ?? null;
}

/**
 * Срок фазы строки (QG3): последняя неделя самой поздней полосы этой фазы и её срочный спринт.
 * Срок неявный — полосу сдвинули, срок сдвинулся; null — полос фазы у строки нет.
 */
export function phaseDeadline(input: {
  phase: QuarterlyPlanPhase;
  plan: Pick<QuarterlyPlanContent, 'assignments' | 'epics'>;
  row: PlanRowRef;
  sprints: readonly QuarterlyPlanSprint[];
  weeks: readonly QuarterWeek[];
}): PhaseDeadline | null {
  const ends = phaseAssignmentsOfRow(input.plan, input.row, input.phase).map(
    (assignment) => assignment.startWeek + assignment.weeks - 1
  );
  const week = input.weeks[Math.max(...ends)];
  if (!week) return null;
  const sprint = deadlineSprintOfWeek(input.sprints, week);
  return { endDate: sprint ? dayOf(sprint.endDate) : week.endDate, sprint, week: week.index };
}

/**
 * Направления «проработано, не разбито» (QG4): срок discovery направления прошёл, а delivery-полос
 * нет ни у него самого, ни у его эпиков. Сигнал, не проблема плана. `today` — ISO date-only.
 */
export function collectUnsplitDirectionIds(
  plan: Pick<QuarterlyPlan, 'assignments' | 'directions' | 'epics' | 'teams'>,
  weeks: readonly QuarterWeek[],
  today: string
): string[] {
  return plan.directions
    .filter((direction) => {
      const row: PlanRowRef = { id: direction.id, kind: 'direction' };
      const sprints = plan.teams.find((team) => team.id === direction.teamId)?.sprints ?? [];
      const discovery = phaseDeadline({ phase: 'discovery', plan, row, sprints, weeks });
      if (!discovery || discovery.endDate >= today) return false;
      return phaseDeadline({ phase: 'delivery', plan, row, sprints, weeks }) === null;
    })
    .map((direction) => direction.id);
}
