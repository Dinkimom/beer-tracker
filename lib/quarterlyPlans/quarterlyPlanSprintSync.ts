/**
 * Синхронизация плана и спринта (QK9 docs/QUARTERLY_PLAN_RULES.md): список расхождений задач (QK8) и для
 * каждого — что можно сделать в каждую сторону. Сдвиг в спринт двигает карточку целиком на день начала
 * полосы, длину не трогает; принятие дат спринта ставит полосу задачи на дни карточки. Чистые функции.
 */

import type { DaySpan } from './quarterlyPlanLayout';
import type { QuarterlyPlan, QuarterlyPlanSprintCard } from './quarterlyPlanTypes';
import type { QuarterWeek } from './quarterWeeks';

import { buildSprintContextCalendarDays } from '@/lib/sprints/sprintContextEnrichmentHelpers';

import { daySpanOf, epicTitle } from './quarterlyPlanLayout';
import { sprintCardDrift } from './quarterlyPlanSprintCards';
import { quarterDayIsoDate, resolveDaySpan } from './quarterWeeks';

/** Почему в эту сторону синхронизировать нельзя; null — можно. */
type SprintSyncBlocker =
  /** У задачи несколько полос: неясно, какую подгонять под карточку. */
  | 'manyBars'
  /** Карточка стоит вне квартала: полосу на эти дни не поставить. */
  | 'outsideQuarter'
  /** Начало полосы — не рабочий день спринта карточки: её пришлось бы переносить в другой спринт. */
  | 'outsideSprint'
  /** Карточка уже начинается в день начала полосы, разница — в длине, а длину сдвиг не меняет. */
  | 'sameStart';

/** Расхождение задачи: где она в плане, где в спринте и что можно сделать в каждую сторону. */
export interface QuarterlyPlanSprintDrift {
  /** Строка задачи в плане. */
  epicId: string;
  issueKey: string;
  /** Срок полос задачи в плане — датами. */
  plan: { endDate: string; startDate: string };
  sprint: QuarterlyPlanSprintCard;
  title: string;
  /** Подогнать полосу под карточку: какая полоса и на какие дни; иначе — почему нельзя. */
  toPlan: { assignmentId: string; span: DaySpan } | { blocker: SprintSyncBlocker };
  /** Сдвинуть карточку по плану: на какой рабочий день спринта встанет её начало; иначе — почему нельзя. */
  toSprint: { blocker: SprintSyncBlocker } | { startDay: number };
}

/**
 * Расхождения плана и спринта по привязанным задачам эпиков (QK8), в порядке плана. \`rowIds\` — только задачи
 * этих строк: эпика или направления вместе с задачами под ними; без него — все.
 */
export function collectSprintDrifts(
  plan: Pick<QuarterlyPlan, 'assignments' | 'epics' | 'sprintCards' | 'trackerEpics'>,
  weeks: readonly QuarterWeek[],
  rowIds?: ReadonlySet<string>
): QuarterlyPlanSprintDrift[] {
  const epicById = new Map(plan.epics.map((epic) => [epic.id, epic]));
  return plan.epics.flatMap((task): QuarterlyPlanSprintDrift[] => {
    if (!task.parentEpicId || !task.issueKey) return [];
    const parent = epicById.get(task.parentEpicId);
    const wanted = !rowIds || [task.id, task.parentEpicId, task.directionId, parent?.directionId].some((id) => id && rowIds.has(id));
    const card = plan.sprintCards[task.issueKey];
    const assignments = plan.assignments.filter((assignment) => assignment.epicId === task.id);
    if (!wanted || !card || !sprintCardDrift({ assignments, card, weeks })) return [];
    const spans = assignments.map(daySpanOf);
    const startDay = Math.min(...spans.map((span) => span.startDay));
    const endDay = Math.max(...spans.map((span) => span.startDay + span.days)) - 1;
    const planStartDate = quarterDayIsoDate(weeks, startDay) ?? '';
    const sprintDay = buildSprintContextCalendarDays(card.sprintStartDate, card.sprintEndDate).find(
      (day) => day.date === planStartDate
    );
    const cardSpan = resolveDaySpan(weeks, card.startDate, card.endDate);
    const [only] = assignments;
    return [
      {
        epicId: task.id,
        issueKey: task.issueKey,
        plan: { endDate: quarterDayIsoDate(weeks, endDay) ?? '', startDate: planStartDate },
        sprint: card,
        title: epicTitle(task, plan.trackerEpics),
        toPlan:
          assignments.length === 1 && only && cardSpan
            ? { assignmentId: only.id, span: cardSpan }
            : { blocker: assignments.length > 1 ? 'manyBars' : 'outsideQuarter' },
        toSprint: sprintTarget(sprintDay?.day, card, planStartDate),
      },
    ];
  });
}

/** Куда сдвинуть карточку: рабочий день спринта, где начинается полоса; нельзя — почему. */
function sprintTarget(
  sprintDay: number | undefined,
  card: QuarterlyPlanSprintCard,
  planStartDate: string
): QuarterlyPlanSprintDrift['toSprint'] {
  if (sprintDay === undefined) return { blocker: 'outsideSprint' };
  return card.startDate === planStartDate ? { blocker: 'sameStart' } : { startDay: sprintDay };
}

/** Отрезок карточки на доске спринта. */
interface CardSegment {
  duration: number;
  startDay: number;
  startPart: number;
}

/**
 * Карточка, сдвинутая так, чтобы начиналась в рабочий день \`startDay\` спринта (QK9): все отрезки едут на одно
 * число дней, части дня и длина не меняются.
 */
export function shiftSprintCard<T extends CardSegment & { segments?: CardSegment[] | null }>(card: T, startDay: number): T {
  const segments = card.segments?.length ? card.segments : null;
  const firstDay = Math.min(card.startDay, ...(segments ?? []).map((segment) => segment.startDay));
  const delta = startDay - firstDay;
  return {
    ...card,
    startDay: card.startDay + delta,
    ...(segments ? { segments: segments.map((segment) => ({ ...segment, startDay: segment.startDay + delta })) } : {}),
  };
}
