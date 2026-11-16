/**
 * Пункты черновика агента (QM10): пакет операций делится по сущностям плана — направление, эпик, назначение,
 * связь, заметка. Человек принимает или отклоняет пункты по одному, как правки агента на доске спринта.
 * Чистые функции: операции и их цели (`applyQuarterlyPlanOps().targets`) на входе.
 */

import type { QuarterlyPlanOp } from './quarterlyPlanOps';

type QuarterlyPlanDraftItemKind = 'assignment' | 'direction' | 'epic' | 'link' | 'note';

/** Пункт черновика: одна сущность плана и что черновик с ней делает. */
export interface QuarterlyPlanDraftItem {
  change: 'added' | 'changed' | 'removed';
  id: string;
  kind: QuarterlyPlanDraftItemKind;
}

const KIND_OF_OP: Record<QuarterlyPlanOp['op'], QuarterlyPlanDraftItemKind> = {
  addDirection: 'direction',
  addEpic: 'epic',
  addLink: 'link',
  addNote: 'note',
  assign: 'assignment',
  moveDirection: 'direction',
  moveEpic: 'epic',
  removeAssignment: 'assignment',
  removeDirection: 'direction',
  removeEpic: 'epic',
  removeLink: 'link',
  removeNote: 'note',
  updateAssignment: 'assignment',
  updateDirection: 'direction',
  updateEpic: 'epic',
  updateNote: 'note',
};

/** Поля операций, где стоит id сущности или `$имя` из того же пакета. */
const REF_FIELDS = [
  'afterId',
  'anchorId',
  'assignmentId',
  'directionId',
  'epicId',
  'fromId',
  'linkId',
  'noteId',
  'parentEpicId',
  'teamId',
  'toId',
] as const;

function opChange(op: QuarterlyPlanOp): QuarterlyPlanDraftItem['change'] {
  if (op.op.startsWith('remove')) return 'removed';
  return op.op.startsWith('add') || op.op === 'assign' ? 'added' : 'changed';
}

/** `$имена`, на которые ссылается операция. */
function usedRefs(op: QuarterlyPlanOp): string[] {
  const fields = op as Partial<Record<(typeof REF_FIELDS)[number], unknown>>;
  const values: unknown[] = REF_FIELDS.map((field) => fields[field]);
  if ('row' in op && op.row) values.push(op.row.id);
  return values.filter((value): value is string => typeof value === 'string' && value.startsWith('$'));
}

/** Номера операций, без которых операция не применится: те, что создали её `$имена`. */
function opDependencies(ops: readonly QuarterlyPlanOp[]): number[][] {
  const definedBy = new Map<string, number>();
  ops.forEach((op, index) => {
    if ('ref' in op && op.ref) definedBy.set(op.ref, index);
  });
  return ops.map((op) => usedRefs(op).flatMap((name) => definedBy.get(name) ?? []));
}

/**
 * Пункты черновика по порядку операций. Сущность, которую пакет и создаёт, и удаляет, на доске не видна —
 * пункта нет; операции без сущности (направление с тем же названием уже есть, QM5) — тоже.
 */
export function quarterlyPlanDraftItems(
  ops: readonly QuarterlyPlanOp[],
  targets: readonly (string | null)[]
): QuarterlyPlanDraftItem[] {
  const items = new Map<string, Omit<QuarterlyPlanDraftItem, 'change'> & { added: boolean; removed: boolean }>();
  ops.forEach((op, index) => {
    const id = targets[index];
    if (!id) return;
    const change = opChange(op);
    const item = items.get(id) ?? { added: false, id, kind: KIND_OF_OP[op.op], removed: false };
    item.added ||= change === 'added';
    item.removed ||= change === 'removed';
    items.set(id, item);
  });
  return [...items.values()].flatMap(({ added, id, kind, removed }): QuarterlyPlanDraftItem[] => {
    if (added && removed) return [];
    if (removed) return [{ change: 'removed', id, kind }];
    return [{ change: added ? 'added' : 'changed', id, kind }];
  });
}

/**
 * Операции, которые решение о пунктах `itemIds` забирает из черновика (QM10). Пункт берётся целиком —
 * все операции над его сущностью. Принять: ещё и то, без чего пункт не применится (эпик назначения,
 * направление эпика). Отклонить: ещё и то, что без пункта не применится (назначения на отклонённый эпик).
 */
export function selectQuarterlyPlanDraftOps(input: {
  itemIds: readonly string[];
  mode: 'approve' | 'reject';
  ops: readonly QuarterlyPlanOp[];
  targets: readonly (string | null)[];
}): Set<number> {
  const { mode, ops, targets } = input;
  const deps = opDependencies(ops);
  const selected = new Set<number>();
  const take = (index: number) => {
    if (selected.has(index)) return;
    selected.add(index);
    const target = targets[index];
    if (target) targets.forEach((other, otherIndex) => other === target && selected.add(otherIndex));
  };
  const wanted = new Set(input.itemIds);
  targets.forEach((target, index) => target && wanted.has(target) && take(index));
  for (let size = -1; size !== selected.size; ) {
    size = selected.size;
    ops.forEach((_, index) => {
      if (mode === 'approve' && selected.has(index)) deps[index]?.forEach(take);
      if (mode === 'reject' && deps[index]?.some((dep) => selected.has(dep))) take(index);
    });
  }
  return selected;
}

/** Оставшиеся операции после принятия части: `$имена` принятых сущностей заменяются их id в плане. */
export function resolveQuarterlyPlanDraftRefs(
  ops: readonly QuarterlyPlanOp[],
  refs: Readonly<Record<string, string>>
): QuarterlyPlanOp[] {
  const resolve = (value: unknown) => (typeof value === 'string' && refs[value] ? refs[value] : value);
  return ops.map((op) => {
    const next: Record<string, unknown> = { ...op };
    for (const field of REF_FIELDS) {
      if (field in next) next[field] = resolve(next[field]);
    }
    if ('row' in op && op.row) next.row = { ...op.row, id: resolve(op.row.id) };
    return next as QuarterlyPlanOp;
  });
}
