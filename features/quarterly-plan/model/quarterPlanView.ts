/**
 * Что доска квартала вычисляет из плана: полосы по строкам, задачи эпиков, люди, проблемы, отсутствия.
 * Экземпляр живёт, пока не сменились план, недели, отсутствия или «Скрыть готовые»; каждое значение
 * считается при первом чтении и запоминается. Открытое меню, выбранный инструмент и прочее преходящее
 * UI сюда не входят — от них вид не пересчитывается.
 */

import type { MemberAbsence } from '../quarterlyPlanBoardModel';
import type { QuarterlyPlanIssue } from '@/lib/quarterlyPlans/quarterlyPlanIssues';
import type { QuarterlyPlan, QuarterlyPlanAssignment, QuarterlyPlanEpic, QuarterlyPlanLink } from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { QuarterWeek } from '@/lib/quarterlyPlans/quarterWeeks';
import type { Developer } from '@/types';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { formatLocalDateToIsoDateOnly } from '@/lib/isoDateOnlyCalendar';
import { collectQuarterlyPlanIssues } from '@/lib/quarterlyPlans/quarterlyPlanIssues';
import { epicTitle, orderLinkEnds, violatedBlockersByAssignment } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { collectUnsplitDirectionIds } from '@/lib/quarterlyPlans/quarterlyPlanPhases';
import { epicRowIds, rivalAssignments, tasksByEpic } from '@/lib/quarterlyPlans/quarterlyPlanRows';
import { QUARTER_WORKING_DAYS_PER_WEEK, weekIndexOfDate } from '@/lib/quarterlyPlans/quarterWeeks';

import { buildAbsenceByMember } from '../quarterlyPlanBoardModel';
import { rollupLinkEnds, rollupLinks } from '../quarterlyPlanDetail';

interface QuarterPlanViewInput {
  eventsByBoard: ReadonlyMap<number, BoardAvailabilityEvent[]>;
  hideDone: boolean;
  /** «Сейчас» планера: текущая неделя и «проработано, не разбито». */
  now: Date;
  /** План на доске: сохранённый, с показанным черновиком агента или выбранная версия из истории. */
  plan: QuarterlyPlan;
  /** План после черновика: убранное черновиком стоит на доске, но в проблемы не идёт. */
  planAfterDraft: QuarterlyPlan;
  /** Уровень «Квартал» (QZ3): сводные полосы и их связи, без расхождений со спринтом. */
  quarterView: boolean;
  weeks: readonly QuarterWeek[];
}

function groupBy(
  assignments: readonly QuarterlyPlanAssignment[],
  key: 'directionId' | 'epicId' | 'memberId'
): Map<string, QuarterlyPlanAssignment[]> {
  const groups = new Map<string, QuarterlyPlanAssignment[]>();
  for (const assignment of assignments) {
    const value = assignment[key];
    if (value !== undefined) groups.set(value, [...(groups.get(value) ?? []), assignment]);
  }
  return groups;
}

const NO_SPRINT_CARDS: QuarterlyPlan['sprintCards'] = {};

export class QuarterPlanView {
  private readonly cache = new Map<string, unknown>();

  constructor(private readonly input: QuarterPlanViewInput) {}

  get plan(): QuarterlyPlan {
    return this.input.plan;
  }

  get weeks(): readonly QuarterWeek[] {
    return this.input.weeks;
  }

  /** Индекс текущей недели; -1, если «сегодня» вне квартала. */
  get currentWeek(): number {
    return this.once('currentWeek', () => weekIndexOfDate(this.weeks, this.input.now));
  }

  get dayCount(): number {
    return this.weeks.length * QUARTER_WORKING_DAYS_PER_WEEK;
  }

  /** Карточки привязанных задач на досках спринтов по ключу трекера (QK8); на уровне «Квартал» их нет (QZ3). */
  get sprintCards(): QuarterlyPlan['sprintCards'] {
    return this.input.quarterView ? NO_SPRINT_CARDS : this.plan.sprintCards;
  }

  /** Связи, которые доска рисует: связи назначений, а на уровне «Квартал» — связи сводных полос (QL7). */
  get shownLinks(): ReadonlyArray<QuarterlyPlanLink & { linkIds?: readonly string[] }> {
    return this.once('shownLinks', () => (this.input.quarterView ? rollupLinks(this.plan) : this.plan.links));
  }

  /** Концы новой связи от полосы к полосе — всегда назначения; на уровне «Квартал» полосы сводные. */
  linkEnds(sourceId: string, targetId: string): Pick<QuarterlyPlanLink, 'fromId' | 'toId'> | null {
    if (this.input.quarterView) return rollupLinkEnds(this.plan, sourceId, targetId);
    const source = this.plan.assignments.find((assignment) => assignment.id === sourceId);
    const target = this.plan.assignments.find((assignment) => assignment.id === targetId);
    return source && target ? orderLinkEnds(source, target) : null;
  }

  /** Привязанные эпики трекера по ключу: название, статус, «сделано» (QE5, QE7). */
  get trackerEpics(): QuarterlyPlan['trackerEpics'] {
    return this.plan.trackerEpics;
  }

  get absenceByMember(): ReadonlyMap<string, MemberAbsence> {
    return this.once('absenceByMember', () =>
      buildAbsenceByMember(this.plan.teams, this.input.eventsByBoard, this.weeks)
    );
  }

  get memberById(): ReadonlyMap<string, Developer> {
    return this.once(
      'memberById',
      () => new Map(this.plan.teams.flatMap((team) => team.members).map((member) => [member.id, member]))
    );
  }

  /** Свои полосы направлений (QG2). */
  get assignmentsByDirection(): ReadonlyMap<string, QuarterlyPlanAssignment[]> {
    return this.once('assignmentsByDirection', () => groupBy(this.plan.assignments, 'directionId'));
  }

  get assignmentsByEpic(): ReadonlyMap<string, QuarterlyPlanAssignment[]> {
    return this.once('assignmentsByEpic', () => groupBy(this.plan.assignments, 'epicId'));
  }

  /** Полосы эпика вместе с полосами его задач (QT3); у задачи — только свои. */
  get assignmentsByEpicTree(): ReadonlyMap<string, QuarterlyPlanAssignment[]> {
    return this.once('assignmentsByEpicTree', () => {
      const { epics } = this.plan;
      return new Map(
        epics.map((epic) => [
          epic.id,
          [...epicRowIds(epics, epic.id)].flatMap((rowId) => this.assignmentsByEpic.get(rowId) ?? []),
        ])
      );
    });
  }

  /** Задачи эпиков по эпику-родителю, в порядке плана (QT1). */
  get tasksByEpic(): ReadonlyMap<string, QuarterlyPlanEpic[]> {
    return this.once('tasksByEpic', () => tasksByEpic(this.plan.epics));
  }

  /** Для зависимого назначения — те, кого оно ждёт и кто ещё не закончит к его началу. */
  get violatedBlockers(): ReadonlyMap<string, QuarterlyPlanAssignment[]> {
    return this.once('violatedBlockers', () => violatedBlockersByAssignment(this.plan));
  }

  /** Направления «проработано, не разбито» (QG4). */
  get unsplitDirectionIds(): ReadonlySet<string> {
    return this.once(
      'unsplitDirectionIds',
      () => new Set(collectUnsplitDirectionIds(this.plan, this.weeks, formatLocalDateToIsoDateOnly(this.input.now)))
    );
  }

  /** Пересечения, отсутствия, нарушенный порядок работ — по плану после черновика, в порядке доски. */
  get issues(): readonly QuarterlyPlanIssue[] {
    return this.once('issues', () =>
      collectQuarterlyPlanIssues(this.input.planAfterDraft, this.absenceByMember, this.input.hideDone)
    );
  }

  /** Сколько назначений с проблемами у команды. */
  get issueCountByTeam(): ReadonlyMap<string, number> {
    return this.once('issueCountByTeam', () =>
      this.issues.reduce(
        (counts, issue) => counts.set(issue.teamId, (counts.get(issue.teamId) ?? 0) + 1),
        new Map<string, number>()
      )
    );
  }

  /** Назначения, исполнитель которых больше не в команде эпика (QI6). */
  get notInTeamAssignmentIds(): ReadonlySet<string> {
    return this.once(
      'notInTeamAssignmentIds',
      () => new Set(this.issues.filter((issue) => issue.notInTeam).map((issue) => issue.assignmentId))
    );
  }

  /** Счётчики проблем для шапки: всего и по видам. */
  get issueCounts(): { away: number; blocked: number; notInTeam: number; parallel: number; total: number } {
    return this.once('issueCounts', () => ({
      away: this.issues.filter((issue) => issue.away).length,
      blocked: this.issues.filter((issue) => issue.blocked).length,
      notInTeam: this.issues.filter((issue) => issue.notInTeam).length,
      parallel: this.issues.filter((issue) => issue.parallel).length,
      total: this.issues.length,
    }));
  }

  /** Эпик с задачами или полосами убирают после подтверждения — отмены на доске нет; пустой — сразу. */
  readonly epicRemovalNeedsConfirm = (epicId: string): boolean =>
    epicRowIds(this.plan.epics, epicId).size > 1 || this.plan.assignments.some((assignment) => assignment.epicId === epicId);

  /** Методы — стрелочные поля: компоненты берут их деструктуризацией. Другие назначения того же человека, с которыми это может стоять параллельно: без полос той же работы (QT3). */
  readonly rivalAssignmentsOf = (assignment: QuarterlyPlanAssignment): QuarterlyPlanAssignment[] => {
    const rivalsOf = this.once('rivalsOf', () => rivalAssignments(this.plan.epics));
    const byMember = this.once('assignmentsByMember', () => groupBy(this.plan.assignments, 'memberId'));
    return rivalsOf(assignment, byMember.get(assignment.memberId) ?? []);
  };

  /** Название строки назначения — эпика или направления; для подсказок полос. */
  readonly rowTitleOf = (assignment: Pick<QuarterlyPlanAssignment, 'directionId' | 'epicId'>): string => {
    const rowById = this.once('rowById', () => new Map([...this.plan.directions, ...this.plan.epics].map((row) => [row.id, row])));
    const row = rowById.get(assignment.epicId ?? assignment.directionId ?? '');
    return row ? epicTitle(row, this.trackerEpics) : '';
  };

  private once<T>(key: string, compute: () => T): T {
    if (!this.cache.has(key)) this.cache.set(key, compute());
    return this.cache.get(key) as T;
  }
}
