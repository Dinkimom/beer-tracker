import { describe, expect, it } from 'vitest';

import {
  addBacklogTaskRange,
  applyBacklogSelectionToggle,
  selectAllBacklogTaskIds,
  toggleBacklogTaskSelection,
  withoutBacklogTaskIds,
} from './backlogSelection';

describe('toggleBacklogTaskSelection', () => {
  it('adds a task and removes it on the next toggle', () => {
    const selected = toggleBacklogTaskSelection(new Set(), 'A');
    expect(selected).toEqual(new Set(['A']));
    expect(toggleBacklogTaskSelection(selected, 'A')).toEqual(new Set());
  });
});

describe('addBacklogTaskRange', () => {
  const orderedIds = ['A', 'B', 'C', 'D'];

  it('selects every task between the anchor and the target', () => {
    expect(addBacklogTaskRange(new Set(['Z']), orderedIds, 'D', 'B')).toEqual(new Set(['Z', 'B', 'C', 'D']));
  });

  it('returns null when the anchor is outside the list', () => {
    expect(addBacklogTaskRange(new Set(), orderedIds, 'missing', 'A')).toBeNull();
  });
});

describe('applyBacklogSelectionToggle', () => {
  const orderedIds = ['A', 'B', 'C'];

  it('keeps the anchor while shift extends the selection', () => {
    const first = applyBacklogSelectionToggle({
      anchor: null,
      orderedIds,
      scopeId: 'backlog',
      selected: new Set(),
      shiftKey: false,
      taskId: 'A',
    });
    const second = applyBacklogSelectionToggle({
      anchor: first.anchor,
      orderedIds,
      scopeId: 'backlog',
      selected: first.selected,
      shiftKey: true,
      taskId: 'C',
    });
    expect(second.selected).toEqual(new Set(['A', 'B', 'C']));
    expect(second.anchor).toEqual({ scopeId: 'backlog', taskId: 'A' });
  });

  it('does not range-select across sections', () => {
    const result = applyBacklogSelectionToggle({
      anchor: { scopeId: 'backlog', taskId: 'A' },
      orderedIds,
      scopeId: 'sprint:1',
      selected: new Set(['A']),
      shiftKey: true,
      taskId: 'C',
    });
    expect(result.selected).toEqual(new Set(['A', 'C']));
    expect(result.anchor).toEqual({ scopeId: 'sprint:1', taskId: 'C' });
  });
});

describe('selectAllBacklogTaskIds', () => {
  it('unions every visible group into the selection', () => {
    expect(selectAllBacklogTaskIds(new Set(['keep']), [['A'], ['B', 'A']])).toEqual(new Set(['keep', 'A', 'B']));
  });
});

describe('withoutBacklogTaskIds', () => {
  it('drops only the moved ids', () => {
    expect(withoutBacklogTaskIds(new Set(['A', 'B']), ['A'])).toEqual(new Set(['B']));
  });
});
