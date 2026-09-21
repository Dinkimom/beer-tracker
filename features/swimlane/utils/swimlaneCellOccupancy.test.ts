import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  buildSwimlaneOccupiedCellIndices,
  buildSwimlaneOccupiedLayersByCell,
  clampSwimlaneQuickAddBandBox,
  collectOccupiedLayersForCellRange,
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

describe('buildSwimlaneOccupiedLayersByCell', () => {
  it('records the stacked layer of each card in overlapping cells', () => {
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
        startDay: 0,
        startPart: 1,
        duration: 1,
      },
    ];
    const occupied = buildSwimlaneOccupiedLayersByCell(
      positions,
      new Map([
        ['a', 0],
        ['b', 1],
      ])
    );

    expect(occupied.get(0)).toEqual(new Set([0]));
    expect(occupied.get(1)).toEqual(new Set([0, 1]));
  });

  it('marks every vertical layer spanned by a photo card', () => {
    const positions: TaskPosition[] = [
      {
        taskId: 'local-image:1',
        assignee: 'dev-1',
        startDay: 0,
        startPart: 0,
        duration: 2,
      },
    ];
    const occupied = buildSwimlaneOccupiedLayersByCell(
      positions,
      new Map([['local-image:1', 1]]),
      new Map([['local-image:1', 2]])
    );

    expect(occupied.get(0)).toEqual(new Set([1, 2]));
    expect(occupied.get(1)).toEqual(new Set([1, 2]));
  });

  it('marks overdue baseline cells as occupied on the same layer as the card', () => {
    const positions: TaskPosition[] = [
      {
        taskId: 'overdue',
        assignee: 'dev-1',
        startDay: 0,
        startPart: 0,
        duration: 2,
      },
    ];
    const occupied = buildSwimlaneOccupiedLayersByCell(
      positions,
      new Map([['overdue', 0]]),
      undefined,
      [{ end: 5, start: 2, taskId: 'overdue' }]
    );

    expect(occupied.get(0)).toEqual(new Set([0]));
    expect(occupied.get(1)).toEqual(new Set([0]));
    expect(occupied.get(2)).toEqual(new Set([0]));
    expect(occupied.get(3)).toEqual(new Set([0]));
    expect(occupied.get(4)).toEqual(new Set([0]));
    expect(occupied.get(5)).toBeUndefined();
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

describe('resolveSwimlaneQuickAddLayerBand', () => {
  it('uses a single card slot in an empty cell, even when the row is taller', () => {
    expect(resolveSwimlaneQuickAddLayerBand(undefined, 2)).toEqual({ layer: 0, span: 1 });
    expect(resolveSwimlaneQuickAddLayerBand(new Set(), 1)).toEqual({ layer: 0, span: 1 });
  });

  it('uses remaining vertical layers when a shorter card is in a tall row', () => {
    expect(resolveSwimlaneQuickAddLayerBand(new Set([0]), 2)).toEqual({ layer: 1, span: 1 });
    expect(resolveSwimlaneQuickAddLayerBand(new Set([1]), 2)).toEqual({ layer: 0, span: 1 });
    expect(resolveSwimlaneQuickAddLayerBand(new Set([0]), 3)).toEqual({ layer: 1, span: 1 });
  });

  it('returns null when every row layer is occupied', () => {
    expect(resolveSwimlaneQuickAddLayerBand(new Set([0]), 1)).toBeNull();
    expect(resolveSwimlaneQuickAddLayerBand(new Set([0, 1]), 2)).toBeNull();
  });

  it('keeps the add control off an overdue baseline in a tall row', () => {
    const occupied = buildSwimlaneOccupiedLayersByCell(
      [
        {
          taskId: 'overdue',
          assignee: 'dev-1',
          startDay: 0,
          startPart: 0,
          duration: 2,
        },
      ],
      new Map([['overdue', 0]]),
      undefined,
      [{ end: 5, start: 2, taskId: 'overdue' }]
    );

    expect(resolveSwimlaneQuickAddLayerBand(occupied.get(3), 3)).toEqual({ layer: 1, span: 1 });
    expect(resolveSwimlaneQuickAddLayerBand(occupied.get(3), 1)).toBeNull();
  });

  it('needs two free stacked layers for a photo footprint', () => {
    expect(resolveSwimlaneQuickAddLayerBand(undefined, 1, 2)).toEqual({ layer: 0, span: 2 });
    expect(resolveSwimlaneQuickAddLayerBand(new Set([0]), 2, 2)).toEqual({ layer: 1, span: 2 });
    expect(resolveSwimlaneQuickAddLayerBand(new Set([1]), 3, 2)).toEqual({ layer: 2, span: 2 });
    expect(resolveSwimlaneQuickAddLayerBand(new Set([2]), 3, 2)).toEqual({ layer: 0, span: 2 });
    expect(resolveSwimlaneQuickAddLayerBand(new Set([0, 1]), 2, 2)).toBeNull();
    expect(resolveSwimlaneQuickAddLayerBand(new Set([0, 1]), 4, 2)).toEqual({
      layer: 2,
      span: 2,
    });
  });
});

describe('collectOccupiedLayersForCellRange', () => {
  it('unions layers across the photo width so the plus cannot sit on a neighbor card', () => {
    const occupied = new Map<number, Set<number>>([
      [4, new Set([0])],
      [5, new Set([1])],
    ]);
    expect(collectOccupiedLayersForCellRange(occupied, 4, 2)).toEqual(new Set([0, 1]));
    expect(collectOccupiedLayersForCellRange(occupied, 4, 1)).toEqual(new Set([0]));
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
