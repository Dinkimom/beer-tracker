import type { QuarterlyPlanContent } from './quarterlyPlanTypes';

type Collection = keyof QuarterlyPlanContent;

const COLLECTIONS: readonly Collection[] = ['directions', 'epics', 'assignments', 'links', 'notes'];

/** Что черновик агента делает с планом (QM9): по этому доска выделяет новое, изменённое и убранное. */
export interface QuarterlyPlanDraftDiff {
  /** id сущностей, которых в плане нет. */
  added: ReadonlySet<string>;
  /** id сущностей, которые в черновике выглядят иначе. */
  changed: ReadonlySet<string>;
  /** Из изменённых — строки, которым черновик только поставил ключ задачи трекера: «прилинковано», а не «изменено». */
  linked: ReadonlySet<string>;
  /** id сущностей плана, которых в черновике нет (удалены сами или вместе с родителем). */
  removed: ReadonlySet<string>;
}

/** Изменение — только привязка к трекеру: появился или сменился `issueKey`, остальное то же. */
function isOnlyLinked(previous: { id: string }, item: { id: string }): boolean {
  const { issueKey: was, ...before } = previous as { id: string; issueKey?: string };
  const { issueKey: now, ...after } = item as { id: string; issueKey?: string };
  return Boolean(now) && now !== was && JSON.stringify(before) === JSON.stringify(after);
}

function byId<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

/** Индексы самой длинной возрастающей подпоследовательности: эти элементы порядка не меняли. */
function longestIncreasing(values: readonly number[]): Set<number> {
  const length = values.map(() => 1);
  const previous = values.map(() => -1);
  values.forEach((value, index) => {
    for (let before = 0; before < index; before += 1) {
      if (values[before]! < value && length[before]! + 1 > length[index]!) {
        length[index] = length[before]! + 1;
        previous[index] = before;
      }
    }
  });
  const kept = new Set<number>();
  for (let index = length.indexOf(Math.max(0, ...length)); index >= 0; index = previous[index]!) kept.add(index);
  return kept;
}

/**
 * Строки, которые черновик переставил (QO4): из общих строк — те, что не входят в самую длинную цепочку,
 * сохранившую взаимный порядок. Одна перестановка помечает одну строку, а не всех её соседей.
 */
function movedIds(was: readonly { id: string }[], now: readonly { id: string }[]): string[] {
  const wasIndex = new Map(was.map((item, index) => [item.id, index]));
  const common = now.filter((item) => wasIndex.has(item.id));
  const kept = longestIncreasing(common.map((item) => wasIndex.get(item.id)!));
  return common.filter((_, index) => !kept.has(index)).map((item) => item.id);
}

/** Сравнивает план с планом после черновика: добавлено, изменено, убрано — по всем видам сущностей. */
export function diffQuarterlyPlanDraft(before: QuarterlyPlanContent, after: QuarterlyPlanContent): QuarterlyPlanDraftDiff {
  const added = new Set<string>();
  /** id изменённой сущности → изменение — только привязка к трекеру. */
  const changed = new Map<string, boolean>();
  const removed = new Set<string>();
  for (const collection of COLLECTIONS) {
    const was = byId<{ id: string }>(before[collection]);
    const now = byId<{ id: string }>(after[collection]);
    for (const [id, item] of now) {
      const previous = was.get(id);
      if (!previous) {
        added.add(id);
      } else if (JSON.stringify(previous) !== JSON.stringify(item)) {
        changed.set(id, isOnlyLinked(previous, item));
      }
    }
    [...was.keys()].filter((id) => !now.has(id)).forEach((id) => removed.add(id));
  }
  // Порядок что-то значит только у строк доски: направлений и эпиков с задачами.
  for (const collection of ['directions', 'epics'] as const) {
    movedIds(before[collection], after[collection])
      .filter((id) => !changed.has(id))
      .forEach((id) => changed.set(id, false));
  }
  return {
    added,
    changed: new Set(changed.keys()),
    linked: new Set([...changed].filter(([, onlyLinked]) => onlyLinked).map(([id]) => id)),
    removed,
  };
}

/** `now` в своём порядке; убранное из `was` — после ближайшего прежнего соседа сверху, который остался. */
function withRemoved<T extends { id: string }>(was: readonly T[], now: readonly T[]): T[] {
  const result = [...now];
  const has = (id: string) => result.some((kept) => kept.id === id);
  for (const [index, item] of was.entries()) {
    if (has(item.id)) continue;
    const above = was.slice(0, index).findLast((candidate) => has(candidate.id));
    result.splice(above ? result.findIndex((kept) => kept.id === above.id) + 1 : 0, 0, item);
  }
  return result;
}

/**
 * План после черновика вместе с тем, что черновик убирает (QM10): убранное стоит на доске на своём месте,
 * пока о нём не решили, — как удаление в предложении агента на доске спринта. Порядок — как в черновике:
 * так видно и перестановку строк (QO4).
 */
export function withRemovedFromDraft(before: QuarterlyPlanContent, after: QuarterlyPlanContent): QuarterlyPlanContent {
  return {
    assignments: withRemoved(before.assignments, after.assignments),
    directions: withRemoved(before.directions, after.directions),
    epics: withRemoved(before.epics, after.epics),
    links: withRemoved(before.links, after.links),
    notes: withRemoved(before.notes, after.notes),
  };
}
