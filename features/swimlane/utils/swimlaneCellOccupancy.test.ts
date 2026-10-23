import type { Task, TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { distributeTasksToLayers, placeSwimlaneLayerItems } from './layerUtils';
import {
  buildSwimlaneOccupiedCellIndices,
  clampSwimlaneQuickAddBandBox,
  resolveSwimlaneQuickAddBandLayout,
  resolveSwimlaneQuickAddLayerBand,
} from './swimlaneCellOccupancy';
import {
  computeSwimlaneRowBandBox,
  resolveSwimlaneStackedTaskBandHeightPx,
} from './taskLayerTaskLayout';

describe('buildSwimlaneOccupiedCellIndices', () => {
  it('marks all cells covered by task positions', () => {
    const positions: TaskPosition[] = [
      {
        taskId: 'a',
        assignee: 'dev-1',
        startDay: 0,
        startPart: 0,
        duration: 2,
      },
      {
        taskId: 'b',
        assignee: 'dev-1',
        startDay: 1,
        startPart: 1,
        duration: 1,
      },
    ];

    expect(buildSwimlaneOccupiedCellIndices(positions)).toEqual(new Set([0, 1, 4]));
  });

  it('includes cells from multi-segment positions', () => {
    const position: TaskPosition = {
      taskId: 'c',
      assignee: 'dev-1',
      startDay: 0,
      startPart: 0,
      duration: 1,
      segments: [
        { startDay: 0, startPart: 0, duration: 1 },
        { startDay: 2, startPart: 2, duration: 1 },
      ],
    };

    expect(buildSwimlaneOccupiedCellIndices([position])).toEqual(new Set([0, 8]));
  });
});

describe('resolveSwimlaneQuickAddBandLayout', () => {
  it('uses stacked band math when the row is reserved taller than content', () => {
    expect(
      resolveSwimlaneQuickAddBandLayout({
        contentHasTaskOverlaps: false,
        maxTaskLayers: 3,
        oneCardHeightPx: 58,
        singleRowLayerHeight: 82,
      })
    ).toEqual({ hasTaskOverlaps: true, layerHeight: 58 });
    const band = computeSwimlaneRowBandBox(
      true,
      0,
      resolveSwimlaneStackedTaskBandHeightPx(3, 58),
      58,
      1
    );
    expect(Number.parseFloat(String(band.height))).toBe(58);
  });

  it('keeps single-row band math for a one-layer row without content overlap', () => {
    expect(
      resolveSwimlaneQuickAddBandLayout({
        contentHasTaskOverlaps: false,
        maxTaskLayers: 1,
        oneCardHeightPx: 58,
        singleRowLayerHeight: 82,
      })
    ).toEqual({ hasTaskOverlaps: false, layerHeight: 82 });
  });
});

function lanePosition(taskId: string, startPart: number, duration: number): TaskPosition {
  return { taskId, assignee: 'dev-1', startDay: 0, startPart, duration };
}

function laneTask(id: string, extra: Partial<Task> = {}): Task {
  return { id, link: '', name: id, status: 'todo', ...extra } as Task;
}

function lane(
  entries: Array<{ duration: number; id: string; startPart: number; task?: Partial<Task> }>,
  baselines: Array<{ end: number; start: number; taskId: string }> = []
) {
  return placeSwimlaneLayerItems(
    entries.map(({ duration, id, startPart, task }) => ({
      task: laneTask(id, task),
      position: lanePosition(id, startPart, duration),
    })),
    baselines
  );
}

describe('resolveSwimlaneQuickAddLayerBand', () => {
  it('uses a single card slot in an empty cell, even when the row is taller', () => {
    expect(
      resolveSwimlaneQuickAddLayerBand({ durationCells: 1, lane: undefined, maxTaskLayers: 2, startCell: 0 })
    ).toEqual({ layer: 0, span: 1 });
  });

  it('stacks above a card that already covers the cell', () => {
    const placed = lane([{ id: 'a', startPart: 0, duration: 2 }]);
    expect(
      resolveSwimlaneQuickAddLayerBand({ durationCells: 1, lane: placed, maxTaskLayers: 2, startCell: 1 })
    ).toEqual({ layer: 1, span: 1 });
  });

  it('returns null when the slot is above the visible row layers', () => {
    const placed = lane([{ id: 'a', startPart: 0, duration: 2 }]);
    expect(
      resolveSwimlaneQuickAddLayerBand({ durationCells: 1, lane: placed, maxTaskLayers: 1, startCell: 1 })
    ).toBeNull();
  });

  it('keeps the add control off an overdue baseline', () => {
    const placed = lane(
      [{ id: 'overdue', startPart: 0, duration: 2 }],
      [{ end: 5, start: 2, taskId: 'overdue' }]
    );
    expect(
      resolveSwimlaneQuickAddLayerBand({ durationCells: 1, lane: placed, maxTaskLayers: 3, startCell: 3 })
    ).toEqual({ layer: 1, span: 1 });
    expect(
      resolveSwimlaneQuickAddLayerBand({ durationCells: 1, lane: placed, maxTaskLayers: 1, startCell: 3 })
    ).toBeNull();
  });

  it('needs two free stacked layers for a photo footprint', () => {
    expect(
      resolveSwimlaneQuickAddLayerBand({ durationCells: 2, lane: undefined, maxTaskLayers: 1, span: 2, startCell: 0 })
    ).toEqual({ layer: 0, span: 2 });
    const placed = lane([{ id: 'a', startPart: 0, duration: 2 }]);
    expect(
      resolveSwimlaneQuickAddLayerBand({ durationCells: 2, lane: placed, maxTaskLayers: 2, span: 2, startCell: 1 })
    ).toEqual({ layer: 1, span: 2 });
  });

  it('auto-arrange: shows the slot the greedy packing gives the draft', () => {
    // «a» начинается позже: при автосортировке новая заметка укладывается раньше и забирает слой 0.
    const placed = lane([{ id: 'a', startPart: 2, duration: 2 }]);
    expect(
      resolveSwimlaneQuickAddLayerBand({ autoArrange: true, durationCells: 2, lane: placed, maxTaskLayers: 2, startCell: 1 })
    ).toEqual({ layer: 0, span: 1 });
    const draft = {
      task: laneTask('draft', { isLocalTask: true, localDraftKind: 'comment' }),
      position: lanePosition('draft', 1, 2),
    };
    const a = { task: laneTask('a'), position: lanePosition('a', 2, 2) };
    expect(distributeTasksToLayers([draft, a]).get('draft')).toBe(0);
  });

  it('takes the free gap and the draft and the saved card land there too', () => {
    // «a» начинается позже, но уже стоит на доске: новая двухчастная заметка не вытесняет её.
    const a = { task: laneTask('a'), position: lanePosition('a', 2, 2) };
    const placed = lane([{ id: 'a', startPart: 2, duration: 2 }]);
    const band = resolveSwimlaneQuickAddLayerBand({
      durationCells: 2,
      lane: placed,
      maxTaskLayers: 2,
      startCell: 1,
    });
    const draft = {
      task: laneTask('draft', { isLocalTask: true, localDraftKind: 'comment' }),
      position: lanePosition('draft', 1, 2),
    };
    const saved = {
      task: laneTask('comment:x', { localDraftKind: 'comment' }),
      position: lanePosition('comment:x', 1, 2),
    };
    const seen = new Map([['a', 0], ['draft', 1], ['comment:x', 2]]);
    const draftLayers = distributeTasksToLayers([draft, a], [], undefined, undefined, seen);
    const savedLayers = distributeTasksToLayers([saved, a], [], undefined, undefined, seen);

    expect(band).toEqual({ layer: 1, span: 1 });
    expect(draftLayers.get('draft')).toBe(1);
    expect(savedLayers.get('comment:x')).toBe(1);
    expect(draftLayers.get('a')).toBe(0);
    expect(savedLayers.get('a')).toBe(0);
  });
});

describe('clampSwimlaneQuickAddBandBox', () => {
  it('keeps a slot that already fits the row', () => {
    expect(
      clampSwimlaneQuickAddBandBox({ top: '12px', height: '58px' }, 82)
    ).toEqual({ top: '12px', height: '58px' });
  });

  it('returns null when the slot overflows the row', () => {
    expect(clampSwimlaneQuickAddBandBox({ top: '70px', height: '58px' }, 82)).toBeNull();
  });

  it('returns null when the computed band has no height', () => {
    expect(clampSwimlaneQuickAddBandBox({ top: '70px', height: '0px' }, 140)).toBeNull();
  });
});
