/**
 * Карточки задач на досках спринтов для квартального плана (QK8 docs/QUARTERLY_PLAN_RULES.md): где задача
 * стоит в спринте и расходится ли это с её полосами в плане. Чистые функции — одна реализация для доски и агентов.
 */

import type { DaySpan } from './quarterlyPlanLayout';
import type { QuarterlyPlanAssignment, QuarterlyPlanSprint, QuarterlyPlanSprintCard } from './quarterlyPlanTypes';
import type { QuarterWeek } from './quarterWeeks';

import { buildSprintContextCalendarDays } from '@/lib/sprints/sprintContextEnrichmentHelpers';

import { daySpanOf } from './quarterlyPlanLayout';
import { resolveDaySpan } from './quarterWeeks';

/** Отрезок карточки на доске спринта: рабочий день спринта, часть дня и длина в частях. */
interface CardSegment {
  duration: number;
  startDay: number;
  startPart: number;
}

/** Позиция карточки на доске спринта; у разбитой на отрезки срок — от начала первого до конца последнего. */
export interface SprintCardPosition extends CardSegment {
  segments?: readonly CardSegment[] | null;
  sprintId: number;
  taskId: string;
}

/** Первый и последний рабочий день карточки датами; null — карточка вне рабочих дней спринта. */
function cardDates(
  position: SprintCardPosition,
  sprint: Pick<QuarterlyPlanSprint, 'endDate' | 'startDate'>,
  partsPerDay: number
): { endDate: string; startDate: string } | null {
  const segments = position.segments?.length ? position.segments : [position];
  const cells = segments.map((segment) => {
    const start = segment.startDay * partsPerDay + segment.startPart;
    return { end: start + segment.duration - 1, start };
  });
  const firstDay = Math.floor(Math.min(...cells.map((cell) => cell.start)) / partsPerDay);
  const lastDay = Math.floor(Math.max(...cells.map((cell) => cell.end)) / partsPerDay);
  const days = buildSprintContextCalendarDays(sprint.startDate, sprint.endDate);
  const startDate = days.find((day) => day.day === firstDay)?.date;
  // Карточка, вылезшая за конец спринта, кончается его последним рабочим днём.
  const endDate = (days.find((day) => day.day === lastDay) ?? days.at(-1))?.date;
  return startDate && endDate ? { endDate, startDate } : null;
}

/**
 * Карточки задач по ключу трекера. Задача стоит на досках нескольких спринтов — берётся самый поздний:
 * там она стоит сейчас, в прежних — её прошлые места.
 */
export function buildSprintCards(input: {
  partsPerDay: number;
  positions: readonly SprintCardPosition[];
  sprints: readonly QuarterlyPlanSprint[];
}): Record<string, QuarterlyPlanSprintCard> {
  const cards: Record<string, QuarterlyPlanSprintCard> = {};
  for (const sprint of [...input.sprints].sort((a, b) => a.startDate.localeCompare(b.startDate))) {
    for (const position of input.positions.filter((row) => row.sprintId === sprint.id)) {
      const dates = cardDates(position, sprint, input.partsPerDay);
      if (dates) {
        cards[position.taskId] = {
          ...dates,
          sprintEndDate: sprint.endDate,
          sprintId: sprint.id,
          sprintName: sprint.name,
          sprintStartDate: sprint.startDate,
        };
      }
    }
  }
  return cards;
}

/**
 * Расхождение плана и спринта (QK8): срок карточки в спринте в днях квартала, если он не тот, что у полос
 * задачи. Полосы с точностью до дня сравниваются день в день; полоса целыми неделями расходится, только
 * когда карточка выходит за её недели. null — расхождения нет, сравнивать нечего или карточка вне квартала.
 */
export function sprintCardDrift(input: {
  assignments: readonly QuarterlyPlanAssignment[];
  card: Pick<QuarterlyPlanSprintCard, 'endDate' | 'startDate'> | undefined;
  weeks: readonly QuarterWeek[];
}): DaySpan | null {
  const cardSpan = input.card ? resolveDaySpan(input.weeks, input.card.startDate, input.card.endDate) : null;
  if (!cardSpan || input.assignments.length === 0) return null;
  const spans = input.assignments.map(daySpanOf);
  const planStart = Math.min(...spans.map((span) => span.startDay));
  const planEnd = Math.max(...spans.map((span) => span.startDay + span.days));
  const cardEnd = cardSpan.startDay + cardSpan.days;
  const byDay = input.assignments.some((assignment) => assignment.startDay !== undefined);
  const matches = byDay
    ? cardSpan.startDay === planStart && cardEnd === planEnd
    : cardSpan.startDay >= planStart && cardEnd <= planEnd;
  return matches ? null : cardSpan;
}
