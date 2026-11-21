import type { BoardObjectEventRow, IssueFieldEventRow } from './sprintHistory';

import { describe, expect, it } from 'vitest';

import { boardObjectRowToEvent, issueFieldRowToEvent, mergeSprintHistory } from './sprintHistory';

function issueRow(patch: Partial<IssueFieldEventRow>): IssueFieldEventRow {
  return {
    author_display: 'Ada',
    author_id: 'acc-ada',
    changed_at: '2026-11-10T09:00:00.000Z',
    entry_ord: 1,
    field: 'sprint',
    field_ord: 1,
    from_ids: [],
    from_text: null,
    issue_key: 'BT-1',
    issue_title: null,
    to_ids: ['41'],
    to_text: 'BT 41',
    ...patch,
  };
}

function boardRow(patch: Partial<BoardObjectEventRow>): BoardObjectEventRow {
  return {
    action: 'update',
    actor_id: 'user-1',
    actor_name: 'Ann',
    after: { day: 2, text: 'new' },
    before: { day: 1, text: 'old' },
    channel: 'ui',
    client_brand: '',
    created_at: new Date('2026-11-11T10:00:00.000Z'),
    id: 7,
    object_id: 'note-1',
    object_kind: 'note',
    ...patch,
  };
}

describe('issueFieldRowToEvent', () => {
  it('reads sprint membership changes relative to this sprint', () => {
    expect(issueFieldRowToEvent(issueRow({}), 41)).toMatchObject({ change: 'added', field: 'sprint', issueKey: 'BT-1' });
    expect(issueFieldRowToEvent(issueRow({ from_ids: ['41'], to_ids: ['42'] }), 41)?.change).toBe('removed');
    expect(issueFieldRowToEvent(issueRow({ issue_title: ' Payouts ' }), 41)?.issueTitle).toBe('Payouts');
    expect(issueFieldRowToEvent(issueRow({ issue_title: '' }), 41)?.issueTitle).toBeNull();
    // Сменился другой спринт задачи — не про этот.
    expect(issueFieldRowToEvent(issueRow({ from_ids: ['40'], to_ids: ['40', '42'] }), 41)).toBeNull();
  });

  it('keeps other plan fields as changes with tracker author', () => {
    expect(
      issueFieldRowToEvent(issueRow({ field: 'deadline', from_text: '2026-11-12', to_text: '2026-11-14' }), 41)
    ).toEqual({
      actor: { channel: null, clientBrand: null, id: 'acc-ada', name: 'Ada' },
      at: '2026-11-10T09:00:00.000Z',
      change: 'changed',
      field: 'deadline',
      from: '2026-11-12',
      id: 't:BT-1:1:1',
      issueKey: 'BT-1',
      issueTitle: null,
      source: 'tracker',
      to: '2026-11-14',
    });
    expect(issueFieldRowToEvent(issueRow({ field: 'summary' }), 41)).toBeNull();
  });
});

describe('boardObjectRowToEvent', () => {
  it('lists changed fields and the previous text of a note', () => {
    expect(boardObjectRowToEvent(boardRow({}))).toMatchObject({
      action: 'update',
      actor: { channel: 'ui', clientBrand: null, id: 'user-1', name: 'Ann' },
      changedFields: ['day', 'text'],
      previousText: 'old',
      text: 'new',
    });
  });

  it('keeps the last text of a deleted goal and the agent brand', () => {
    expect(
      boardObjectRowToEvent(
        boardRow({
          action: 'delete',
          after: null,
          before: { done: true, text: 'Ship' },
          channel: 'agent',
          client_brand: 'claude',
          object_kind: 'goal',
        })
      )
    ).toMatchObject({ actor: { channel: 'agent', clientBrand: 'claude' }, changedFields: [], done: true, text: 'Ship' });
  });

  it('reads link ends and drops unknown rows', () => {
    expect(
      boardObjectRowToEvent(
        boardRow({ action: 'create', after: { fromTaskId: 'BT-1', toTaskId: 'note-1' }, before: null, object_kind: 'link' })
      )?.linkEnds
    ).toEqual({ from: 'BT-1', to: 'note-1' });
    expect(boardObjectRowToEvent(boardRow({ object_kind: 'position' }))).toBeNull();
  });
});

describe('mergeSprintHistory', () => {
  it('puts newest first across both sources and caps the list', () => {
    const issue = issueFieldRowToEvent(issueRow({}), 41)!;
    const board = boardObjectRowToEvent(boardRow({}))!;
    expect(mergeSprintHistory([issue], [board], 10).map((event) => event.id)).toEqual(['b:7', 't:BT-1:1:1']);
    expect(mergeSprintHistory([issue], [board], 1)).toHaveLength(1);
  });
});
