import type { QuarterlyPlanContent } from './quarterlyPlanTypes';

type Collection = keyof QuarterlyPlanContent;

const COLLECTIONS: readonly Collection[] = ['directions', 'epics', 'assignments', 'links', 'notes'];

/** Что черновик агента делает с планом (QM9): по этому доска выделяет новое и изменённое, плашка считает. */
export interface QuarterlyPlanDraftDiff {
  /** id сущностей, которых в плане нет. */
  added: ReadonlySet<string>;
  /** id сущностей, которые в черновике выглядят иначе. */
  changed: ReadonlySet<string>;
  counts: Record<Collection, { added: number; changed: number; removed: number }>;
}

function byId<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

/** Сравнивает план с планом после черновика: добавлено, изменено, убрано — по каждому виду сущностей. */
export function diffQuarterlyPlanDraft(before: QuarterlyPlanContent, after: QuarterlyPlanContent): QuarterlyPlanDraftDiff {
  const added = new Set<string>();
  const changed = new Set<string>();
  const counts = {} as QuarterlyPlanDraftDiff['counts'];
  for (const collection of COLLECTIONS) {
    const was = byId<{ id: string }>(before[collection]);
    const now = byId<{ id: string }>(after[collection]);
    const count = { added: 0, changed: 0, removed: 0 };
    for (const [id, item] of now) {
      const previous = was.get(id);
      if (!previous) {
        added.add(id);
        count.added += 1;
      } else if (JSON.stringify(previous) !== JSON.stringify(item)) {
        changed.add(id);
        count.changed += 1;
      }
    }
    count.removed = [...was.keys()].filter((id) => !now.has(id)).length;
    counts[collection] = count;
  }
  return { added, changed, counts };
}
