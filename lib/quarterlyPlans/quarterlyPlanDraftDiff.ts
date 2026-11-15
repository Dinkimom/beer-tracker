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
  return {
    added,
    changed: new Set(changed.keys()),
    linked: new Set([...changed].filter(([, onlyLinked]) => onlyLinked).map(([id]) => id)),
    removed,
  };
}

/**
 * План после черновика вместе с тем, что черновик убирает (QM10): убранное стоит на доске на своём месте,
 * пока о нём не решили, — как удаление в предложении агента на доске спринта. Новое — после прежнего.
 */
export function withRemovedFromDraft(before: QuarterlyPlanContent, after: QuarterlyPlanContent): QuarterlyPlanContent {
  const merge = <T extends { id: string }>(was: readonly T[], now: readonly T[]): T[] => {
    const nowById = byId(now);
    const wasIds = new Set(was.map((item) => item.id));
    return [...was.map((item) => nowById.get(item.id) ?? item), ...now.filter((item) => !wasIds.has(item.id))];
  };
  return {
    assignments: merge(before.assignments, after.assignments),
    directions: merge(before.directions, after.directions),
    epics: merge(before.epics, after.epics),
    links: merge(before.links, after.links),
    notes: merge(before.notes, after.notes),
  };
}
