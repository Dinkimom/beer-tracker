import type { QuarterlyPlanOp } from './quarterlyPlanOps';
import type { QuarterlyPlanContent } from './quarterlyPlanTypes';

import { describe, expect, it } from 'vitest';

import { applyQuarterlyPlanOps, QuarterlyPlanOpsSchema } from './quarterlyPlanOps';

/** Q4 2026: неделя 0 = 28.09–02.10, 14 недель. */
const Q4 = { quarter: 4, year: 2026 } as const;
const teams = {
  memberIdsByTeam: new Map([
    ['t1', new Set(['alice', 'bob'])],
    ['t2', new Set(['grace'])],
  ]),
};

const EMPTY: QuarterlyPlanContent = { assignments: [], directions: [], epics: [], links: [], notes: [] };

function run(ops: QuarterlyPlanOp[], content: QuarterlyPlanContent = EMPTY) {
  let counter = 0;
  return applyQuarterlyPlanOps({ content, newId: () => `id${++counter}`, ops, ref: Q4, teams });
}

function ok(ops: QuarterlyPlanOp[], content?: QuarterlyPlanContent) {
  const result = run(ops, content);
  if (!result.ok) throw new Error(`op ${result.opIndex}: ${result.error}`);
  return result;
}

/** Направление с эпиком DEMO-1 и назначением Alice на недели 0–1. */
const BASE = ok([
  { op: 'addDirection', ref: '$d', teamId: 't1', title: 'Checkout' },
  { directionId: '$d', issueKey: 'DEMO-1', op: 'addEpic', ref: '$e', title: 'Payment API' },
  { epicId: '$e', memberId: 'alice', op: 'assign', ref: '$a', span: { startWeek: 0, weeks: 2 } },
]);

describe('applyQuarterlyPlanOps', () => {
  it('создаёт сущности и связывает их ссылками внутри пакета (QM1)', () => {
    expect(BASE.refs).toEqual({ $a: 'id3', $d: 'id1', $e: 'id2' });
    expect(BASE.content.epics).toEqual([
      { directionId: 'id1', id: 'id2', issueKey: 'DEMO-1', status: 'backlog', title: 'Payment API' },
    ]);
    expect(BASE.content.assignments).toEqual([{ epicId: 'id2', id: 'id3', memberId: 'alice', startWeek: 0, weeks: 2 }]);
  });

  it('у каждой операции — её сущность: созданная, изменённая или удалённая; взятое существующее направление — ничья (QM10)', () => {
    expect(BASE.targets).toEqual(['id1', 'id2', 'id3']);
    const next = ok(
      [
        { op: 'addDirection', teamId: 't1', title: 'checkout' },
        { epicId: 'id2', op: 'updateEpic', title: 'Payments' },
        { assignmentId: 'id3', op: 'removeAssignment' },
      ],
      BASE.content
    );
    expect(next.targets).toEqual([null, 'id2', 'id3']);
  });

  it('newId получает номер операции', () => {
    const result = applyQuarterlyPlanOps({
      content: EMPTY,
      newId: (opIndex) => `op${opIndex}`,
      ops: [
        { op: 'addDirection', ref: '$d', teamId: 't1', title: 'Checkout' },
        { directionId: '$d', op: 'addEpic', title: 'Payment API' },
      ],
      ref: Q4,
      teams,
    });
    expect(result.ok && result.targets).toEqual(['op0', 'op1']);
  });

  it('пакет атомарный: ошибка во второй операции не меняет план и называет номер', () => {
    const result = run(
      [
        { op: 'addDirection', teamId: 't1', title: 'Promo' },
        { epicId: 'missing', op: 'removeEpic' },
      ],
      BASE.content
    );
    expect(result).toEqual({ error: 'removeEpic: unknown epic missing', ok: false, opIndex: 1 });
  });

  it('исполнитель — только из команды эпика (QA3)', () => {
    const result = run([{ epicId: 'id2', memberId: 'grace', op: 'assign', span: { startWeek: 3, weeks: 1 } }], BASE.content);
    expect(result.ok ? '' : result.error).toBe('assign: member grace is not in the epic\'s team t1');
  });

  it('срок датами переводится в недели; за краем квартала — ошибка (QM3)', () => {
    const dated = ok(
      [{ epicId: 'id2', memberId: 'bob', op: 'assign', span: { endDate: '2026-10-14', startDate: '2026-10-07' } }],
      BASE.content
    );
    expect(dated.content.assignments[1]).toMatchObject({ startWeek: 1, weeks: 2 });
    const outside = run([{ epicId: 'id2', memberId: 'bob', op: 'assign', span: { startWeek: 13, weeks: 2 } }], BASE.content);
    expect(outside.ok ? '' : outside.error).toMatch(/outside the quarter \(14 weeks\)/);
    const weekend = run(
      [{ epicId: 'id2', memberId: 'bob', op: 'assign', span: { endDate: '2027-01-10', startDate: '2027-01-09' } }],
      BASE.content
    );
    expect(weekend.ok).toBe(false);
  });

  it('повторный перенос: направление находится по названию, эпик трекера второй раз не встаёт (QM5)', () => {
    const again = run(
      [
        { op: 'addDirection', ref: '$d', teamId: 't1', title: 'checkout' },
        { directionId: '$d', issueKey: 'DEMO-1', op: 'addEpic' },
      ],
      BASE.content
    );
    expect(again).toEqual({
      error: 'addEpic: issue DEMO-1 is already in the plan as epic id2',
      ok: false,
      opIndex: 1,
    });
    expect(ok([{ op: 'addDirection', teamId: 't1', title: 'CHECKOUT' }], BASE.content).content.directions).toHaveLength(1);
  });

  it('статус привязанного эпика не ставится вручную; отвязка возвращает «Бэклог» (QE7)', () => {
    const linked = run([{ epicId: 'id2', op: 'updateEpic', status: 'done' }], BASE.content);
    expect(linked.ok ? '' : linked.error).toMatch(/linked to the tracker/);
    const unlinked = ok([{ epicId: 'id2', op: 'updateEpic', unlink: true }], BASE.content);
    expect(unlinked.content.epics[0]).toMatchObject({ issueKey: undefined, status: 'backlog', title: 'Payment API' });
    const manual = ok([{ epicId: 'id2', op: 'updateEpic', status: 'test' }], unlinked.content);
    expect(manual.content.epics[0]?.status).toBe('test');
  });

  it('направление привязывается к эпику трекера; ключ один на весь план (QE4, QE9)', () => {
    const linked = ok(
      [{ directionId: 'id1', issue: { issueKey: 'RND-1', title: 'Checkout epic' }, op: 'updateDirection' }],
      BASE.content
    );
    expect(linked.content.directions[0]).toMatchObject({ issueKey: 'RND-1', title: 'Checkout epic' });
    const taken = run([{ directionId: 'id1', issue: { issueKey: 'DEMO-1', title: 'x' }, op: 'updateDirection' }], BASE.content);
    expect(taken.ok ? '' : taken.error).toMatch(/DEMO-1 is already in the plan as epic id2/);
    const epicTaken = run([{ directionId: 'id1', issueKey: 'RND-1', op: 'addEpic' }], linked.content);
    expect(epicTaken.ok ? '' : epicTaken.error).toMatch(/RND-1 is already in the plan as direction id1/);
    const unlinked = ok([{ directionId: 'id1', op: 'updateDirection', unlink: true }], linked.content);
    expect(unlinked.content.directions[0]).toMatchObject({ issueKey: undefined, title: 'Checkout epic' });
  });

  it('связь: порядок задаёт агент, петля и дубль — ошибка (QL1, QL4)', () => {
    const linked = ok(
      [
        { epicId: 'id2', memberId: 'bob', op: 'assign', ref: '$b', span: { startWeek: 2, weeks: 2 } },
        { fromId: 'id3', op: 'addLink', toId: '$b' },
      ],
      BASE.content
    );
    expect(linked.content.links).toEqual([{ fromId: 'id3', id: 'id2', toId: 'id1' }]);
    const duplicate = run([{ fromId: 'id1', op: 'addLink', toId: 'id3' }], linked.content);
    expect(duplicate.ok ? '' : duplicate.error).toMatch(/already linked/);
    const self = run([{ fromId: 'id3', op: 'addLink', toId: 'id3' }], linked.content);
    expect(self.ok ? '' : self.error).toMatch(/cannot wait for itself/);
  });

  it('заметка ставится в существующую строку; удаление эпика уносит её (QE9)', () => {
    const noted = ok(
      [{ op: 'addNote', row: { id: 'id2', kind: 'epic' }, span: { startWeek: 0, weeks: 3 }, text: 'Waiting for contract' }],
      BASE.content
    );
    expect(noted.content.notes[0]).toMatchObject({ color: 'yellow', rows: 2, startWeek: 0, weeks: 3 });
    const badRow = run([{ op: 'addNote', row: { id: 't9', kind: 'team' }, span: { startWeek: 0, weeks: 1 }, text: 'x' }]);
    expect(badRow.ok ? '' : badRow.error).toBe('addNote: unknown team t9');
    const removed = ok([{ epicId: 'id2', op: 'removeEpic' }], noted.content);
    expect(removed.content).toMatchObject({ assignments: [], epics: [], notes: [] });
  });

  it('схема принимает пакет из MCP и отклоняет неизвестную операцию', () => {
    expect(QuarterlyPlanOpsSchema.safeParse([{ epicId: 'e', op: 'removeEpic' }]).success).toBe(true);
    expect(QuarterlyPlanOpsSchema.safeParse([{ op: 'moveEverything' }]).success).toBe(false);
    expect(QuarterlyPlanOpsSchema.safeParse([]).success).toBe(false);
  });
});
