import type { QuarterlyPlanOp } from './quarterlyPlanOps';

import { describe, expect, it } from 'vitest';

import {
  quarterlyPlanDraftItems,
  resolveQuarterlyPlanDraftRefs,
  selectQuarterlyPlanDraftOps,
} from './quarterlyPlanDraftItems';

/** Направление → эпик → два назначения со связью; правка эпика; заметка на новом эпике; удаление чужой заметки. */
const OPS: QuarterlyPlanOp[] = [
  { op: 'addDirection', ref: '$d', teamId: 't1', title: 'Checkout' },
  { directionId: '$d', op: 'addEpic', ref: '$e', title: 'Payments' },
  { epicId: '$e', memberId: 'alice', op: 'assign', ref: '$a1', span: { startWeek: 0, weeks: 2 } },
  { epicId: '$e', memberId: 'bob', op: 'assign', ref: '$a2', span: { startWeek: 2, weeks: 2 } },
  { fromId: '$a1', op: 'addLink', toId: '$a2' },
  { epicId: '$e', op: 'updateEpic', status: 'in_progress' },
  { op: 'addNote', row: { id: '$e', kind: 'epic' }, span: { startWeek: 0, weeks: 1 }, text: 'API first' },
  { noteId: 'n-old', op: 'removeNote' },
];
const TARGETS = ['d', 'e', 'a1', 'a2', 'l', 'e', 'n', 'n-old'];

function select(itemIds: string[], mode: 'approve' | 'reject') {
  return [...selectQuarterlyPlanDraftOps({ itemIds, mode, ops: OPS, targets: TARGETS })].sort((a, b) => a - b);
}

describe('quarterlyPlanDraftItems (QM10)', () => {
  it('пункт — сущность плана: несколько операций над ней — один пункт', () => {
    expect(quarterlyPlanDraftItems(OPS, TARGETS)).toEqual([
      { change: 'added', id: 'd', kind: 'direction' },
      { change: 'added', id: 'e', kind: 'epic' },
      { change: 'added', id: 'a1', kind: 'assignment' },
      { change: 'added', id: 'a2', kind: 'assignment' },
      { change: 'added', id: 'l', kind: 'link' },
      { change: 'added', id: 'n', kind: 'note' },
      { change: 'removed', id: 'n-old', kind: 'note' },
    ]);
  });

  it('без сущности и созданное-и-удалённое в одном пакете — не пункт', () => {
    const ops: QuarterlyPlanOp[] = [
      { op: 'addDirection', teamId: 't1', title: 'Checkout' },
      { directionId: 'd1', op: 'addEpic', ref: '$e', title: 'Tmp' },
      { epicId: '$e', op: 'removeEpic' },
      { epicId: 'e-old', op: 'updateEpic', title: 'Renamed' },
    ];
    expect(quarterlyPlanDraftItems(ops, [null, 'e-new', 'e-new', 'e-old'])).toEqual([
      { change: 'changed', id: 'e-old', kind: 'epic' },
    ]);
  });

  it('принять пункт — с тем, без чего он не применится', () => {
    // Связь тянет оба назначения, они — эпик (обе его операции), эпик — направление.
    expect(select(['l'], 'approve')).toEqual([0, 1, 2, 3, 4, 5]);
    expect(select(['n-old'], 'approve')).toEqual([7]);
  });

  it('отклонить пункт — с тем, что без него не применится', () => {
    expect(select(['a1'], 'reject')).toEqual([2, 4]);
    expect(select(['e'], 'reject')).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('после принятия части `$имена` принятых сущностей в оставшихся операциях заменяются их id', () => {
    const rest = resolveQuarterlyPlanDraftRefs([OPS[3]!, OPS[4]!, OPS[6]!], { $a1: 'a1-id', $d: 'd-id', $e: 'e-id' });
    expect(rest).toEqual([
      { epicId: 'e-id', memberId: 'bob', op: 'assign', ref: '$a2', span: { startWeek: 2, weeks: 2 } },
      { fromId: 'a1-id', op: 'addLink', toId: '$a2' },
      { op: 'addNote', row: { id: 'e-id', kind: 'epic' }, span: { startWeek: 0, weeks: 1 }, text: 'API first' },
    ]);
  });
});
