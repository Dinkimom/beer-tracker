/**
 * История версий квартального плана (раздел «История версий» docs/QUARTERLY_PLAN_RULES.md): когда правка
 * склеивается с прошлой версией и что версия поменяла. Чистые функции — одна реализация для сервера и демо.
 */

import type { QuarterlyPlanContent } from './quarterlyPlanTypes';

import { diffQuarterlyPlanDraft } from './quarterlyPlanDraftDiff';

/** Откуда версия: правка человека, принятый черновик агента, откат к прошлой версии, план до начала истории. */
export type QuarterlyPlanVersionSource = 'agent' | 'baseline' | 'restore' | 'user';

/** Правки одного человека, идущие подряд с паузами меньше этой, — одна версия (QH2). */
export const QUARTER_VERSION_MERGE_WINDOW_MS = 10 * 60 * 1000;

/** Склеить правку с последней версией (QH2): тот же человек, обе — его правки на доске, пауза короче окна. */
export function mergesIntoLatestVersion(
  latest: { authorId: string | null; source: QuarterlyPlanVersionSource; updatedAt: Date } | null,
  next: { authorId: string; at: Date; source: QuarterlyPlanVersionSource }
): boolean {
  if (!latest || latest.source !== 'user' || next.source !== 'user') return false;
  if (latest.authorId !== next.authorId) return false;
  return next.at.getTime() - latest.updatedAt.getTime() < QUARTER_VERSION_MERGE_WINDOW_MS;
}

/** Вид сущности плана в сводке версии: эпик и задача эпика — разные строки (QT1). */
type QuarterlyPlanVersionEntityKind = 'assignment' | 'direction' | 'epic' | 'link' | 'note' | 'task';

/** Сводка версии: сколько сущностей каждого вида она добавила, изменила и убрала (QH3). */
export type QuarterlyPlanVersionSummary = Array<{
  added: number;
  changed: number;
  kind: QuarterlyPlanVersionEntityKind;
  removed: number;
}>;

const KIND_ORDER: readonly QuarterlyPlanVersionEntityKind[] = ['direction', 'epic', 'task', 'assignment', 'link', 'note'];

/** Что версия `after` поменяла относительно `before`; вид без изменений в сводку не попадает. */
export function summarizeQuarterlyPlanVersion(
  before: QuarterlyPlanContent,
  after: QuarterlyPlanContent
): QuarterlyPlanVersionSummary {
  const diff = diffQuarterlyPlanDraft(before, after);
  const kindById = new Map<string, QuarterlyPlanVersionEntityKind>();
  for (const content of [before, after]) {
    content.directions.forEach((row) => kindById.set(row.id, 'direction'));
    content.epics.forEach((row) => kindById.set(row.id, row.parentEpicId === undefined ? 'epic' : 'task'));
    content.assignments.forEach((row) => kindById.set(row.id, 'assignment'));
    content.links.forEach((row) => kindById.set(row.id, 'link'));
    content.notes.forEach((row) => kindById.set(row.id, 'note'));
  }
  const counts = new Map(KIND_ORDER.map((kind) => [kind, { added: 0, changed: 0, kind, removed: 0 }]));
  const count = (ids: ReadonlySet<string>, field: 'added' | 'changed' | 'removed') => {
    for (const id of ids) {
      const entry = counts.get(kindById.get(id) ?? 'note');
      if (entry) entry[field] += 1;
    }
  };
  count(diff.added, 'added');
  count(diff.changed, 'changed');
  count(diff.removed, 'removed');
  return [...counts.values()].filter((entry) => entry.added + entry.changed + entry.removed > 0);
}
