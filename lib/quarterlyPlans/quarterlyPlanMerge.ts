/**
 * Слияние правок квартального плана от нескольких людей (QS5): план сохраняется целиком, поэтому
 * чужое сохранение и своя несохранённая правка сводятся по сущностям относительно общего предка.
 */

import type { QuarterlyPlanContent, QuarterlyPlanEpic, QuarterlyPlanLink } from './quarterlyPlanTypes';

import { isEqual } from 'lodash-es';

import { areLinked } from './quarterlyPlanLayout';

interface Identified {
  id: string;
}

/** Своё новое встаёт после того же соседа, что и у себя; соседа в итоге нет — в начало. */
function insertLocalAdditions<T extends Identified>(merged: T[], local: readonly T[], added: ReadonlySet<string>): T[] {
  const result = [...merged];
  let previousId: string | null = null;
  for (const item of local) {
    if (added.has(item.id)) {
      const index = previousId === null ? -1 : result.findIndex((other) => other.id === previousId);
      result.splice(index + 1, 0, item);
    }
    if (result.some((other) => other.id === item.id)) previousId = item.id;
  }
  return result;
}

/**
 * Сущности одного вида: порядок — чужой; что человек менял сам — его, остальное — чужое.
 * Удалённое любой стороной не возвращается.
 */
function mergeItems<T extends Identified>(base: readonly T[], local: readonly T[], remote: readonly T[]): T[] {
  const baseById = new Map(base.map((item) => [item.id, item]));
  const localById = new Map(local.map((item) => [item.id, item]));
  const remoteIds = new Set(remote.map((item) => item.id));
  const kept = remote.flatMap((theirs) => {
    const before = baseById.get(theirs.id);
    if (!before) return [theirs];
    const mine = localById.get(theirs.id);
    if (!mine) return [];
    return [isEqual(mine, before) ? theirs : mine];
  });
  const added = new Set(local.filter((item) => !baseById.has(item.id) && !remoteIds.has(item.id)).map((item) => item.id));
  return added.size === 0 ? kept : insertLocalAdditions(kept, local, added);
}

/** Эпики и задачи, которым после слияния есть где стоять: направление на месте, родитель — эпик того же направления. */
function epicsWithHome(epics: readonly QuarterlyPlanEpic[], directionIds: ReadonlySet<string>): QuarterlyPlanEpic[] {
  const inDirection = epics.filter((epic) => directionIds.has(epic.directionId));
  const parents = new Map(inDirection.filter((epic) => epic.parentEpicId === undefined).map((epic) => [epic.id, epic]));
  return inDirection.filter(
    (epic) => epic.parentEpicId === undefined || parents.get(epic.parentEpicId)?.directionId === epic.directionId
  );
}

function validLinks(links: readonly QuarterlyPlanLink[], assignmentIds: ReadonlySet<string>): QuarterlyPlanLink[] {
  const result: QuarterlyPlanLink[] = [];
  for (const link of links) {
    const endsExist = assignmentIds.has(link.fromId) && assignmentIds.has(link.toId);
    if (endsExist && link.fromId !== link.toId && !areLinked(result, link.fromId, link.toId)) result.push(link);
  }
  return result;
}

/**
 * Слитый план проходит те же проверки ссылок, что и сохранение: своё, что ссылалось на удалённое
 * другим человеком (полоса удалённого эпика, связь удалённой полосы), уходит вместе с ним.
 */
function dropDangling(content: QuarterlyPlanContent): QuarterlyPlanContent {
  const directionIds = new Set(content.directions.map((direction) => direction.id));
  const epics = epicsWithHome(content.epics, directionIds);
  const epicIds = new Set(epics.map((epic) => epic.id));
  const assignments = content.assignments.filter((assignment) =>
    assignment.epicId === undefined ? directionIds.has(assignment.directionId ?? '') : epicIds.has(assignment.epicId)
  );
  const rowIds = { direction: directionIds, epic: epicIds };
  return {
    assignments,
    directions: content.directions,
    epics,
    links: validLinks(content.links, new Set(assignments.map((assignment) => assignment.id))),
    notes: content.notes.filter(
      (note) => note.row.kind === 'absence' || note.row.kind === 'team' || rowIds[note.row.kind].has(note.row.id)
    ),
  };
}

/** Только то, что редактируется и сохраняется: без данных трекера и спринтов. */
export function quarterlyPlanContentOf(plan: QuarterlyPlanContent): QuarterlyPlanContent {
  const { assignments, directions, epics, links, notes } = plan;
  return { assignments, directions, epics, links, notes };
}

/**
 * План `remote` с сервера и свои несохранённые правки `local`, обе стороны выросли из `base`.
 * Одну сущность поменяли оба — остаётся своя правка.
 */
export function mergeQuarterlyPlanContent(
  base: QuarterlyPlanContent,
  local: QuarterlyPlanContent,
  remote: QuarterlyPlanContent
): QuarterlyPlanContent {
  return dropDangling({
    assignments: mergeItems(base.assignments, local.assignments, remote.assignments),
    directions: mergeItems(base.directions, local.directions, remote.directions),
    epics: mergeItems(base.epics, local.epics, remote.epics),
    links: mergeItems(base.links, local.links, remote.links),
    notes: mergeItems(base.notes, local.notes, remote.notes),
  });
}
