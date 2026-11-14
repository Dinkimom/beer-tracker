/**
 * Связь квартального плана со спринтом (docs/QUARTERLY_PLAN_RULES.md, раздел 12): какая строка плана
 * у задачи спринта и что квартал ждёт от людей команды в окне спринта.
 */

import type {
  QuarterlyPlanAssignment,
  QuarterlyPlanContent,
  QuarterlyPlanTrackerEpic,
  QuarterRef,
} from './quarterlyPlanTypes';

import { epicTitle, isEpicDone } from './quarterlyPlanLayout';
import { buildQuarterWeeks, resolveWeekSpan, type QuarterWeek } from './quarterWeeks';

/** Строка плана задачи: эпик плана (если есть) и его направление. */
interface QuarterlyPlanRowMatch {
  directionId: string;
  epicId?: string;
}

/**
 * Строка плана задачи трекера (QK1). По порядку: задача — сам эпик плана; её родитель — эпик плана;
 * её родитель — эпик трекера направления; задача — сам эпик направления. Один ключ — одна строка
 * на весь план (QE4), поэтому совпадение однозначно. Через два уровня (подзадача → задача → эпик) не ищет.
 */
export function planRowOfIssue(
  plan: Pick<QuarterlyPlanContent, 'directions' | 'epics'>,
  issue: { key: string; parentKey?: string | null }
): QuarterlyPlanRowMatch | null {
  const parentKey = issue.parentKey?.trim() || null;
  const epic =
    plan.epics.find((row) => row.issueKey === issue.key) ??
    (parentKey ? plan.epics.find((row) => row.issueKey === parentKey) : undefined);
  if (epic) return { directionId: epic.directionId, epicId: epic.id };
  const direction =
    (parentKey ? plan.directions.find((row) => row.issueKey === parentKey) : undefined) ??
    plan.directions.find((row) => row.issueKey === issue.key);
  return direction ? { directionId: direction.id } : null;
}

export interface SprintQuarterTask {
  /** Исполнитель в форме доски спринта (id трекера или `staff:<uuid>`), как `memberId` назначения. */
  assigneeId: string | null;
  parentKey: string | null;
  taskId: string;
}

export interface SprintQuarterPlanInput {
  content: QuarterlyPlanContent;
  ref: QuarterRef;
  trackerEpics: Readonly<Record<string, QuarterlyPlanTrackerEpic>>;
  version: number;
}

interface SprintQuarterAssignment {
  endDate: string;
  /** Назначение кончается в этом спринте: план ждёт, что эпик здесь доделают (QK7). */
  endsInSprint: boolean;
  epicId: string;
  id: string;
  memberId: string;
  memberName?: string;
  startDate: string;
  /**
   * Задачи этого человека в спринте по эпику назначения (у непривязанного эпика — и задачи прямо под эпиком
   * трекера его направления); пусто — по плану он на эпике, а задач нет.
   */
  taskIds: string[];
}

export interface SprintQuarterPlanView extends QuarterRef {
  assignments: SprintQuarterAssignment[];
  directions: Array<{ id: string; issueKey?: string; teamId: string; title: string }>;
  epics: Array<{ directionId: string; done: boolean; id: string; issueKey?: string; title: string }>;
  /**
   * Работа вне плана: задачи человека в спринте, которые не относятся ни к его эпикам в окне спринта,
   * ни к их направлениям. Только для людей, у которых в окне спринта есть назначения.
   */
  outsidePlan: Array<{ assigneeId: string; taskIds: string[] }>;
  /** Задачи спринта, у которых нашлась строка плана (QK1). */
  tasks: Array<QuarterlyPlanRowMatch & { taskId: string }>;
  version: number;
  /** Недели квартала, которые задевает спринт. */
  weeks: Array<Pick<QuarterWeek, 'endDate' | 'index' | 'startDate'>>;
}

function overlapsSpan(assignment: QuarterlyPlanAssignment, span: { startWeek: number; weeks: number }): boolean {
  return assignment.startWeek < span.startWeek + span.weeks && assignment.startWeek + assignment.weeks > span.startWeek;
}

/** Задачи человека, которые не относятся к его назначениям в окне (ни по эпику, ни по направлению). */
function outsidePlanOf(
  assignments: readonly SprintQuarterAssignment[],
  tasks: readonly SprintQuarterTask[],
  matchByTask: ReadonlyMap<string, QuarterlyPlanRowMatch>,
  directionOfEpic: ReadonlyMap<string, string>
): SprintQuarterPlanView['outsidePlan'] {
  const memberIds = [...new Set(assignments.map((assignment) => assignment.memberId))];
  return memberIds.flatMap((memberId) => {
    const epicIds = new Set(assignments.filter((a) => a.memberId === memberId).map((a) => a.epicId));
    const directionIds = new Set([...epicIds].map((epicId) => directionOfEpic.get(epicId)));
    const taskIds = tasks
      .filter((task) => task.assigneeId === memberId)
      .filter((task) => {
        const match = matchByTask.get(task.taskId);
        if (!match) return true;
        return !(match.epicId && epicIds.has(match.epicId)) && !directionIds.has(match.directionId);
      })
      .map((task) => task.taskId);
    return taskIds.length > 0 ? [{ assigneeId: memberId, taskIds: [...new Set(taskIds)] }] : [];
  });
}

/**
 * Что квартал говорит о спринте (QK2–QK4) по одному плану: назначения людей в неделях спринта с их задачами,
 * строки плана задач спринта и работа вне плана. Спринт вне квартала — null.
 */
export function buildSprintQuarterPlanView(input: {
  /** Чьи назначения показывать: люди команды доски спринта и исполнители его задач. */
  memberIds: ReadonlySet<string>;
  memberNames?: ReadonlyMap<string, string>;
  plan: SprintQuarterPlanInput;
  sprintWindow: { endDate: string; startDate: string };
  tasks: readonly SprintQuarterTask[];
}): SprintQuarterPlanView | null {
  const { content, ref, trackerEpics } = input.plan;
  const weeks = buildQuarterWeeks(ref);
  const span = resolveWeekSpan(weeks, input.sprintWindow.startDate.slice(0, 10), input.sprintWindow.endDate.slice(0, 10));
  if (!span) return null;

  const matchByTask = new Map<string, QuarterlyPlanRowMatch>();
  for (const task of input.tasks) {
    const match = planRowOfIssue(content, { key: task.taskId, parentKey: task.parentKey });
    if (match) matchByTask.set(task.taskId, match);
  }

  const epicById = new Map(content.epics.map((epic) => [epic.id, epic]));
  const assignments = content.assignments
    .filter((assignment) => input.memberIds.has(assignment.memberId) && overlapsSpan(assignment, span))
    .map((assignment): SprintQuarterAssignment => {
      const memberName = input.memberNames?.get(assignment.memberId);
      const epic = epicById.get(assignment.epicId);
      const taskIds = input.tasks
        .filter((task) => {
          const match = matchByTask.get(task.taskId);
          if (task.assigneeId !== assignment.memberId || !match) return false;
          if (match.epicId) return match.epicId === assignment.epicId;
          // Непривязанному эпику плана задач по ключу не найти: ему идут задачи прямо под эпиком его направления.
          return !epic?.issueKey && match.directionId === epic?.directionId;
        })
        .map((task) => task.taskId);
      return {
        endDate: weeks[assignment.startWeek + assignment.weeks - 1]!.endDate,
        endsInSprint: assignment.startWeek + assignment.weeks <= span.startWeek + span.weeks,
        epicId: assignment.epicId,
        id: assignment.id,
        memberId: assignment.memberId,
        ...(memberName ? { memberName } : {}),
        startDate: weeks[assignment.startWeek]!.startDate,
        taskIds: [...new Set(taskIds)],
      };
    });

  const epicIds = new Set([
    ...assignments.map((assignment) => assignment.epicId),
    ...[...matchByTask.values()].flatMap((match) => (match.epicId ? [match.epicId] : [])),
  ]);
  const epics = content.epics.filter((epic) => epicIds.has(epic.id));
  const directionIds = new Set([...epics.map((epic) => epic.directionId), ...[...matchByTask.values()].map((m) => m.directionId)]);
  const directionOfEpic = new Map(content.epics.map((epic) => [epic.id, epic.directionId]));

  return {
    ...ref,
    assignments,
    directions: content.directions
      .filter((direction) => directionIds.has(direction.id))
      .map((direction) => ({
        id: direction.id,
        ...(direction.issueKey ? { issueKey: direction.issueKey } : {}),
        teamId: direction.teamId,
        title: epicTitle(direction, trackerEpics),
      })),
    epics: epics.map((epic) => ({
      directionId: epic.directionId,
      done: isEpicDone(epic, trackerEpics),
      id: epic.id,
      ...(epic.issueKey ? { issueKey: epic.issueKey } : {}),
      title: epicTitle(epic, trackerEpics),
    })),
    outsidePlan: outsidePlanOf(assignments, input.tasks, matchByTask, directionOfEpic),
    tasks: [...matchByTask].map(([taskId, match]) => ({ taskId, ...match })),
    version: input.plan.version,
    weeks: weeks
      .slice(span.startWeek, span.startWeek + span.weeks)
      .map(({ endDate, index, startDate }) => ({ endDate, index, startDate })),
  };
}
