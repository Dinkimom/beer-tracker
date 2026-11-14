/**
 * Проблемы и риски назначений квартального плана (раздел 6 QUARTERLY_PLAN_RULES.md).
 * Одна реализация для доски и для агентов (MCP): счётчик тулбара и ответ инструмента считают одинаково.
 */

import type { QuarterlyPlan, QuarterlyPlanAssignment, QuarterlyPlanTeam } from './quarterlyPlanTypes';
import type { QuarterWeek } from './quarterWeeks';
import type { AvailabilitySegment } from '@/lib/boardAvailability/availabilitySegments';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { getSegmentsForDeveloper } from '@/lib/boardAvailability/availabilitySegments';
import { parseIsoDateOnly } from '@/lib/isoDateOnlyCalendar';

import {
  absentDaysWithinSpan,
  isEpicDone,
  overlapWeeks,
  violatedBlockersByAssignment,
} from './quarterlyPlanLayout';
import { QUARTER_WORKING_DAYS_PER_WEEK } from './quarterWeeks';

/** Отсутствия человека в днях квартала (индексы рабочих дней от понедельника первой недели). */
export interface MemberAbsenceDays {
  /** Дни, когда человек не может работать над эпиком; дежурство сюда не входит (QV3). */
  blockedDays: Set<number>;
  /** Дни дежурства: работать можно, но это риск (QV3, A2). */
  dutyDays: Set<number>;
  events: BoardAvailabilityEvent[];
  segments: AvailabilitySegment[];
}

export function quarterTimelineStart(weeks: readonly QuarterWeek[]): Date {
  const parsed = parseIsoDateOnly(weeks[0]?.startDate ?? '');
  return parsed ? new Date(parsed.y, parsed.m - 1, parsed.d) : new Date();
}

/**
 * Отсутствия людей на таймлайне квартала. Квартал для раскладки — тот же ряд рабочих дней,
 * что спринт, только длиннее, поэтому сегменты считает общий код доски спринта.
 * События — с доски каждой команды и только её людей (QV1).
 */
export function buildMemberAbsenceDays(
  teams: readonly Pick<QuarterlyPlanTeam, 'boardId' | 'members'>[],
  eventsByBoard: ReadonlyMap<number, BoardAvailabilityEvent[]>,
  weeks: readonly QuarterWeek[]
): Map<string, MemberAbsenceDays> {
  const result = new Map<string, MemberAbsenceDays>();
  const timelineStart = quarterTimelineStart(weeks);
  const dayCount = weeks.length * QUARTER_WORKING_DAYS_PER_WEEK;
  for (const team of teams) {
    const events = eventsByBoard.get(team.boardId) ?? [];
    for (const member of team.members) {
      const segments = getSegmentsForDeveloper(member.id, timelineStart, events, dayCount);
      const daysOf = (duty: boolean) =>
        new Set(
          segments.filter((segment) => (segment.kind === 'duty') === duty).flatMap((segment) => segment.dayIndices)
        );
      result.set(member.id, {
        blockedDays: daysOf(false),
        dutyDays: daysOf(true),
        events: events.filter((event) => event.memberId === member.id),
        segments,
      });
    }
  }
  return result;
}

export interface QuarterlyPlanIssue {
  assignmentId: string;
  /** Человек отсутствует в часть срока (QI1). */
  away: boolean;
  /** Начинается раньше, чем закончится назначение, которого оно ждёт (QI3). */
  blocked: boolean;
  directionId: string;
  /** Исполнитель больше не в команде эпика (QI6). */
  notInTeam: boolean;
  /** В те же недели у человека стоит другой эпик (QI2). */
  parallel: boolean;
  teamId: string;
}

type AbsenceLookup = ReadonlyMap<string, Pick<MemberAbsenceDays, 'blockedDays' | 'dutyDays'>>;

/** Назначения в порядке доски: команда → направление → эпик → начало полосы (QI5). */
function assignmentsInBoardOrder(plan: QuarterlyPlan, hideDone: boolean) {
  const rows: Array<{ assignment: QuarterlyPlanAssignment; directionId: string; team: QuarterlyPlanTeam }> = [];
  const byStart = (a: QuarterlyPlanAssignment, b: QuarterlyPlanAssignment) => a.startWeek - b.startWeek;
  for (const team of plan.teams) {
    for (const direction of plan.directions.filter((item) => item.teamId === team.id)) {
      const epics = plan.epics.filter(
        (epic) => epic.directionId === direction.id && !(hideDone && isEpicDone(epic, plan.trackerEpics))
      );
      for (const epic of epics) {
        const assignments = plan.assignments.filter((assignment) => assignment.epicId === epic.id).sort(byStart);
        rows.push(...assignments.map((assignment) => ({ assignment, directionId: direction.id, team })));
      }
    }
  }
  return rows;
}

/**
 * Назначения с проблемами (QI1–QI3, QI6) в порядке доски. По этому списку считает счётчик тулбара,
 * ходит переход «к следующему пересечению» и отвечает агенту MCP. `hideDone` убирает готовые эпики (QB7).
 */
export function collectQuarterlyPlanIssues(
  plan: QuarterlyPlan,
  absenceByMember: AbsenceLookup,
  hideDone: boolean
): QuarterlyPlanIssue[] {
  const violated = violatedBlockersByAssignment(plan);
  return assignmentsInBoardOrder(plan, hideDone).flatMap(({ assignment, directionId, team }) => {
    const absentDays = absenceByMember.get(assignment.memberId)?.blockedDays ?? new Set<number>();
    const issue: QuarterlyPlanIssue = {
      assignmentId: assignment.id,
      away: absentDaysWithinSpan(assignment, absentDays).length > 0,
      blocked: violated.has(assignment.id),
      directionId,
      notInTeam: !team.members.some((member) => member.id === assignment.memberId),
      parallel: overlapWeeks(assignment, plan.assignments).length > 0,
      teamId: team.id,
    };
    return issue.away || issue.blocked || issue.notInTeam || issue.parallel ? [issue] : [];
  });
}

/** Назначения, в срок которых попадает дежурство исполнителя: риск, не проблема (QV3). */
export function collectDutyRiskAssignmentIds(plan: QuarterlyPlan, absenceByMember: AbsenceLookup): string[] {
  return assignmentsInBoardOrder(plan, false)
    .filter(({ assignment }) => {
      const dutyDays = absenceByMember.get(assignment.memberId)?.dutyDays;
      return dutyDays ? absentDaysWithinSpan(assignment, dutyDays).length > 0 : false;
    })
    .map(({ assignment }) => assignment.id);
}
