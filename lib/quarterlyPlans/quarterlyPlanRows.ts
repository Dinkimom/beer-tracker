/**
 * Строки квартального плана: порядок направлений и эпиков и задачи эпика (разделы «Задачи эпика»
 * и «Порядок строк» docs/QUARTERLY_PLAN_RULES.md). Чистые функции — одна реализация для доски и агентов.
 */

import type { QuarterlyPlanAssignment, QuarterlyPlanContent, QuarterlyPlanEpic } from './quarterlyPlanTypes';

/** Куда встаёт строка относительно другой строки. */
export type QuarterRowPlace = 'after' | 'before';

/** Новый элемент сразу после `afterId`; без него или если такого нет — в конец. */
export function insertAfter<T extends { id: string }>(items: readonly T[], item: T, afterId?: string): T[] {
  const index = afterId === undefined ? -1 : items.findIndex((candidate) => candidate.id === afterId);
  return index === -1 ? [...items, item] : [...items.slice(0, index + 1), item, ...items.slice(index + 1)];
}

/** Эпики направления без задач — строки второго уровня, в порядке плана. */
export function topLevelEpics<T extends Pick<QuarterlyPlanEpic, 'directionId' | 'parentEpicId'>>(
  epics: readonly T[],
  directionId: string
): T[] {
  return epics.filter((epic) => epic.directionId === directionId && epic.parentEpicId === undefined);
}

/** Задачи по эпику-родителю (QT1), в порядке плана. */
export function tasksByEpic<T extends Pick<QuarterlyPlanEpic, 'parentEpicId'>>(epics: readonly T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const epic of epics) {
    if (epic.parentEpicId !== undefined) groups.set(epic.parentEpicId, [...(groups.get(epic.parentEpicId) ?? []), epic]);
  }
  return groups;
}

/** Строки, чьи полосы относятся к эпику: он сам и его задачи (QT3). */
export function epicRowIds(epics: readonly Pick<QuarterlyPlanEpic, 'id' | 'parentEpicId'>[], epicId: string): Set<string> {
  return new Set([epicId, ...epics.filter((epic) => epic.parentEpicId === epicId).map((epic) => epic.id)]);
}

/**
 * Назначения, с которыми это может стоять параллельно (QI2): `others` без полос той же работы.
 * Полоса эпика и полосы его задач — одна работа (QT3): задачи раскрывают, из чего состоит полоса эпика.
 */
export function rivalAssignments(
  epics: readonly Pick<QuarterlyPlanEpic, 'id' | 'parentEpicId'>[]
): (assignment: QuarterlyPlanAssignment, others: readonly QuarterlyPlanAssignment[]) => QuarterlyPlanAssignment[] {
  const parentOf = new Map(epics.map((epic) => [epic.id, epic.parentEpicId]));
  const isParent = (epicId: string | undefined, childId: string | undefined) =>
    epicId !== undefined && childId !== undefined && parentOf.get(childId) === epicId;
  return (assignment, others) =>
    others.filter((other) => !isParent(assignment.epicId, other.epicId) && !isParent(other.epicId, assignment.epicId));
}

function moveNextTo<T extends { id: string }>(items: readonly T[], moved: T, anchorId: string, place: QuarterRowPlace): T[] {
  const rest = items.filter((item) => item.id !== moved.id);
  const index = rest.findIndex((item) => item.id === anchorId) + (place === 'after' ? 1 : 0);
  return [...rest.slice(0, index), moved, ...rest.slice(index)];
}

/**
 * Ставит направление перед другим направлением или после него (QO2). Только внутри своей команды:
 * у другой команды другие люди. Нельзя — план без изменений.
 */
export function moveDirection(
  plan: QuarterlyPlanContent,
  directionId: string,
  anchorId: string,
  place: QuarterRowPlace
): QuarterlyPlanContent {
  const moved = plan.directions.find((direction) => direction.id === directionId);
  const anchor = plan.directions.find((direction) => direction.id === anchorId);
  if (!moved || !anchor || moved.id === anchor.id || moved.teamId !== anchor.teamId) return plan;
  return { ...plan, directions: moveNextTo(plan.directions, moved, anchorId, place) };
}

/** Почему строку нельзя поставить рядом с `anchor`; null — можно (QO3). */
export function moveEpicError(plan: QuarterlyPlanContent, epicId: string, anchorId: string): string | null {
  const moved = plan.epics.find((epic) => epic.id === epicId);
  const anchor = plan.epics.find((epic) => epic.id === anchorId);
  if (!moved || !anchor) return 'unknown epic';
  if (moved.id === anchor.id) return 'a row cannot be placed next to itself';
  if ((moved.parentEpicId === undefined) !== (anchor.parentEpicId === undefined)) {
    return 'an epic goes next to an epic and a task next to a task';
  }
  const teamOf = (directionId: string) => plan.directions.find((direction) => direction.id === directionId)?.teamId;
  return teamOf(moved.directionId) === teamOf(anchor.directionId) ? null : 'rows of different teams';
}

/**
 * Ставит эпик или задачу перед строкой того же уровня или после неё (QO3). Строка берёт направление
 * и эпик-родителя соседа: эпик так переезжает в другое направление своей команды (вместе с задачами),
 * задача — в другой эпик. Нельзя — план без изменений.
 */
export function moveEpic(
  plan: QuarterlyPlanContent,
  epicId: string,
  anchorId: string,
  place: QuarterRowPlace
): QuarterlyPlanContent {
  if (moveEpicError(plan, epicId, anchorId)) return plan;
  const anchor = plan.epics.find((epic) => epic.id === anchorId)!;
  const { parentEpicId: _was, ...row } = plan.epics.find((epic) => epic.id === epicId)!;
  const moved: QuarterlyPlanEpic = {
    ...row,
    directionId: anchor.directionId,
    ...(anchor.parentEpicId === undefined ? {} : { parentEpicId: anchor.parentEpicId }),
  };
  const epics = moveNextTo(plan.epics, moved, anchorId, place).map((epic) =>
    epic.parentEpicId === epicId ? { ...epic, directionId: anchor.directionId } : epic
  );
  return { ...plan, epics };
}
