import { describe, expect, it } from 'vitest';

import { SWIMLANE_STACKED_LAYER_GAP_PX, SWIMLANE_TASK_ROW_VERTICAL_INSET_PX } from '@/features/swimlane/utils/taskLayerTaskLayout';

import {
  DEFAULT_STICKY_NOTE_CARD_ROW_LAYOUT,
  MAX_STICKY_NOTE_CARD_ROW_SPAN,
  pointerYToStickyNoteCardRowIndex,
  resolveStickyNoteCardRowLayoutFromBottomDrag,
  resolveStickyNoteCardRowLayoutFromTopDrag,
  resolveStickyNoteEffectiveCardRowLayout,
  resolveStickyNoteMaxCardRowIndex,
  resolveStickyNoteStartCardRow,
} from './stickyNoteCardRowResizeHelpers';

describe('resolveStickyNoteStartCardRow', () => {
  it('shifts the start row upward', () => {
    expect(
      resolveStickyNoteStartCardRow(2, {
        layerShiftUp: 1,
        span: 2,
      })
    ).toBe(1);
  });
});

describe('resolveStickyNoteCardRowLayoutFromBottomDrag', () => {
  it('snaps span to whole card rows', () => {
    expect(
      resolveStickyNoteCardRowLayoutFromBottomDrag({
        assignedTaskLayer: 1,
        bottomRowIndex: 2,
        layout: DEFAULT_STICKY_NOTE_CARD_ROW_LAYOUT,
        maxRowIndex: 3,
      })
    ).toEqual({ layerShiftUp: 0, span: 2 });
  });

  it('keeps the top row fixed and never shrinks below one card row', () => {
    expect(
      resolveStickyNoteCardRowLayoutFromBottomDrag({
        assignedTaskLayer: 2,
        bottomRowIndex: 0,
        layout: { layerShiftUp: 0, span: 3 },
        maxRowIndex: 5,
      })
    ).toEqual({ layerShiftUp: 0, span: 1 });
  });
});

describe('resolveStickyNoteCardRowLayoutFromTopDrag', () => {
  it('keeps the bottom row fixed while growing upward', () => {
    expect(
      resolveStickyNoteCardRowLayoutFromTopDrag({
        assignedTaskLayer: 2,
        anchorBottomRowIndex: 2,
        maxRowIndex: 3,
        topRowIndex: 1,
      })
    ).toEqual({ layerShiftUp: 1, span: 2 });
  });
});

describe('resolveStickyNoteMaxCardRowIndex', () => {
  it('allows multiple card rows on a single swimlane row without overlaps', () => {
    expect(
      resolveStickyNoteMaxCardRowIndex({
        hasTaskOverlaps: false,
        layerHeight: 82,
        taskBandTotalHeight: 82,
      })
    ).toBe(MAX_STICKY_NOTE_CARD_ROW_SPAN - 1);
  });

  it('allows stacked cards to grow beyond the current band height', () => {
    expect(
      resolveStickyNoteMaxCardRowIndex({
        hasTaskOverlaps: true,
        layerHeight: 40,
        startRowIndex: 2,
        taskBandTotalHeight: 40 * 2 + SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2 + SWIMLANE_STACKED_LAYER_GAP_PX,
      })
    ).toBe(Math.min(MAX_STICKY_NOTE_CARD_ROW_SPAN - 1, 2 + MAX_STICKY_NOTE_CARD_ROW_SPAN - 1));
  });
});

describe('resolveStickyNoteEffectiveCardRowLayout', () => {
  it('clamps invalid span and layer shift', () => {
    expect(resolveStickyNoteEffectiveCardRowLayout({ layerShiftUp: 5, span: 0 })).toEqual({
      layerShiftUp: 0,
      span: 1,
    });
    expect(resolveStickyNoteEffectiveCardRowLayout({ layerShiftUp: 4, span: 2 })).toEqual({
      layerShiftUp: 1,
      span: 2,
    });
  });
});

describe('pointerYToStickyNoteCardRowIndex', () => {
  it('maps pointer position to card-row index in stacked rows', () => {
    const layerHeight = 40;
    const taskBandTotalHeight =
      layerHeight * 3 +
      SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2 +
      SWIMLANE_STACKED_LAYER_GAP_PX * 2;
    const stride = layerHeight + SWIMLANE_STACKED_LAYER_GAP_PX;
    expect(
      pointerYToStickyNoteCardRowIndex({
        hasTaskOverlaps: true,
        layerHeight,
        pointerYInRowPx: SWIMLANE_TASK_ROW_VERTICAL_INSET_PX + layerHeight * 0.5,
        taskBandTotalHeight,
      })
    ).toBe(0);
    expect(
      pointerYToStickyNoteCardRowIndex({
        hasTaskOverlaps: true,
        layerHeight,
        pointerYInRowPx: SWIMLANE_TASK_ROW_VERTICAL_INSET_PX + stride + layerHeight * 0.5,
        taskBandTotalHeight,
      })
    ).toBe(1);
  });
});
