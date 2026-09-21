import { describe, expect, it } from 'vitest';

import {
  buildPlannedLayoutSnapshot,
  computeBaselineStretch,
  computeBaselineStripOpacity,
  computeSwimlaneBaselineInsetsPx,
  computeSwimlaneOverdueBaselineStrips,
  computeSwimlaneRowBandBox,
  computeSwimlaneRowBandStyle,
  computeTaskLayerCardOpacity,
  resolveSwimlaneStackedTaskBandHeightPx,
  SWIMLANE_STACKED_LAYER_GAP_PX,
  SWIMLANE_TASK_CARD_BORDER_RADIUS_PX,
  SWIMLANE_TASK_ROW_VERTICAL_INSET_PX,
} from './taskLayerTaskLayout';

describe('buildPlannedLayoutSnapshot', () => {
  it('uses planned fields when set', () => {
    const snap = buildPlannedLayoutSnapshot({
      assignee: 'a',
      duration: 3,
      plannedDuration: 9,
      plannedStartDay: 1,
      plannedStartPart: 0,
      startDay: 0,
      startPart: 0,
      taskId: 't1',
    });
    expect(snap.plannedDuration).toBe(9);
    expect(snap.plannedStartDay).toBe(1);
  });
});

describe('computeBaselineStretch', () => {
  it('returns null when planned end not before current cell', () => {
    expect(
      computeBaselineStretch({ status: 'todo' } as never, 20, 10)
    ).toBeNull();
  });

  it('returns strip when todo/in-progress and gap exists', () => {
    const r = computeBaselineStretch({ status: 'todo' } as never, 5, 10);
    expect(r).toEqual({ baselineStart: 5, baselineWidth: 5 });
  });
});

describe('computeSwimlaneOverdueBaselineStrips', () => {
  const todo = { status: 'todo' } as never;

  it('returns one strip from the last segment end when overdue', () => {
    const strips = computeSwimlaneOverdueBaselineStrips(
      todo,
      [
        { startDay: 0, startPart: 0, duration: 2 },
        { startDay: 0, startPart: 2, duration: 1 },
      ],
      10
    );
    expect(strips).toEqual([{ baselineStart: 3, baselineWidth: 7 }]);
  });

  it('skips baseline when only earlier segments are overdue', () => {
    const strips = computeSwimlaneOverdueBaselineStrips(
      todo,
      [
        { startDay: 0, startPart: 0, duration: 2 },
        { startDay: 0, startPart: 2, duration: 5 },
      ],
      4
    );
    expect(strips).toEqual([]);
  });

  it('skips swimlane note tasks', () => {
    const strips = computeSwimlaneOverdueBaselineStrips(
      { id: 'comment:abc', status: 'todo' } as never,
      [{ startDay: 0, startPart: 0, duration: 2 }],
      10
    );
    expect(strips).toEqual([]);
  });
});

describe('computeBaselineStripOpacity', () => {
  it('uses hover highlight for active task id', () => {
    expect(
      computeBaselineStripOpacity({
        activeTaskDuration: 3,
        assigneeId: 'a',
        baselineStart: 0,
        baselineWidth: 5,
        hoveredCell: null,
        hoveredTaskId: 'x',
        isDraggingTask: true,
        taskId: 'x',
      })
    ).toBe(1);
  });
});

describe('computeTaskLayerCardOpacity', () => {
  it('full opacity when activeTask set', () => {
    expect(
      computeTaskLayerCardOpacity({
        activeTask: { id: '1' } as never,
        factHoveredTaskId: null,
        hoverConnectedTaskIds: null,
        segmentEditTaskId: null,
        taskId: '2',
      })
    ).toBe(1);
  });

  it('does not dim others when hover cluster is only the hovered card', () => {
    expect(
      computeTaskLayerCardOpacity({
        activeTask: null,
        factHoveredTaskId: null,
        hoverConnectedTaskIds: new Set(['solo']),
        segmentEditTaskId: null,
        taskId: 'other',
      })
    ).toBe(1);
  });

  it('dims cards outside a multi-task link cluster', () => {
    expect(
      computeTaskLayerCardOpacity({
        activeTask: null,
        factHoveredTaskId: null,
        hoverConnectedTaskIds: new Set(['a', 'b']),
        segmentEditTaskId: null,
        taskId: 'other',
      })
    ).toBe(0.5);
  });

  it('keeps linked cards bright inside the hover cluster', () => {
    expect(
      computeTaskLayerCardOpacity({
        activeTask: null,
        factHoveredTaskId: null,
        hoverConnectedTaskIds: new Set(['a', 'b']),
        segmentEditTaskId: null,
        taskId: 'b',
      })
    ).toBe(1);
  });

  it('dims other cards when a fact marker is hovered', () => {
    expect(
      computeTaskLayerCardOpacity({
        activeTask: null,
        factHoveredTaskId: 'fact-task',
        hoverConnectedTaskIds: null,
        segmentEditTaskId: null,
        taskId: 'other',
      })
    ).toBe(0.5);
  });
});

describe('computeSwimlaneBaselineInsetsPx', () => {
  it('is shorter than the card band by the card border radius on each side', () => {
    const layerHeight = 82;
    const card = computeSwimlaneRowBandBox(false, 0, layerHeight, layerHeight);
    const baseline = computeSwimlaneBaselineInsetsPx(false, 0, layerHeight, layerHeight);
    const cardHeight = Number.parseFloat(String(card.height));
    expect(baseline.top).toBe(
      Number.parseFloat(String(card.top)) + SWIMLANE_TASK_CARD_BORDER_RADIUS_PX
    );
    expect(baseline.height).toBe(cardHeight - SWIMLANE_TASK_CARD_BORDER_RADIUS_PX * 2);
    expect(baseline).toEqual({
      height:
        layerHeight -
        SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2 -
        SWIMLANE_TASK_CARD_BORDER_RADIUS_PX * 2,
      top: SWIMLANE_TASK_ROW_VERTICAL_INSET_PX + SWIMLANE_TASK_CARD_BORDER_RADIUS_PX,
    });
  });

  it('matches the stacked card band minus border radius when tasks overlap', () => {
    const cardHeight = 82 - SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2;
    const totalHeight = resolveSwimlaneStackedTaskBandHeightPx(2, cardHeight);
    for (const taskLayer of [0, 1]) {
      const card = computeSwimlaneRowBandBox(true, taskLayer, totalHeight, cardHeight);
      const baseline = computeSwimlaneBaselineInsetsPx(
        true,
        taskLayer,
        totalHeight,
        cardHeight
      );
      expect(baseline.top).toBe(
        Number.parseFloat(String(card.top)) + SWIMLANE_TASK_CARD_BORDER_RADIUS_PX
      );
      expect(baseline.height).toBe(
        Number.parseFloat(String(card.height)) - SWIMLANE_TASK_CARD_BORDER_RADIUS_PX * 2
      );
    }
  });

  it('keeps a one-card height when a photo makes the swimlane row taller', () => {
    const singleRowHeight = 82;
    const photoRowHeight =
      (singleRowHeight - SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2) * 2 +
      SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2;
    const card = computeSwimlaneRowBandBox(false, 0, singleRowHeight, singleRowHeight, 1);
    const baseline = computeSwimlaneBaselineInsetsPx(
      false,
      0,
      singleRowHeight,
      singleRowHeight,
      1
    );
    expect(photoRowHeight).toBeGreaterThan(singleRowHeight);
    expect(baseline.height).toBe(
      Number.parseFloat(String(card.height)) - SWIMLANE_TASK_CARD_BORDER_RADIUS_PX * 2
    );
    expect(baseline.height + baseline.top).toBeLessThan(photoRowHeight);
  });
});

describe('computeSwimlaneRowBandBox', () => {
  const oneCardHeight = 82 - SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2;
  const totalHeight = resolveSwimlaneStackedTaskBandHeightPx(2, oneCardHeight);

  it('matches a stacked card band when spanning a single layer', () => {
    const card = computeSwimlaneRowBandStyle(true, 1, totalHeight, oneCardHeight);
    const box = computeSwimlaneRowBandBox(true, 1, totalHeight, oneCardHeight, 1);
    const top = Number.parseFloat(String(card.top));
    const bottom = Number.parseFloat(String(card.bottom));
    expect(box.top).toBe(card.top);
    expect(box.height).toBe(`${totalHeight - top - bottom}px`);
  });

  it('fills remaining stacked layers including the gap between them', () => {
    const box = computeSwimlaneRowBandBox(true, 0, totalHeight, oneCardHeight, 2);
    expect(box).toEqual({
      top: `${SWIMLANE_TASK_ROW_VERTICAL_INSET_PX}px`,
      height: `${oneCardHeight * 2 + SWIMLANE_STACKED_LAYER_GAP_PX}px`,
    });
  });

  it('stacks a photo to n card heights in a single-row band', () => {
    const singleRowHeight = 82;
    const box = computeSwimlaneRowBandBox(false, 0, singleRowHeight, singleRowHeight, 2);
    expect(box).toEqual({
      top: `${SWIMLANE_TASK_ROW_VERTICAL_INSET_PX}px`,
      height: `${(singleRowHeight - SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2) * 2}px`,
    });
  });

  it('places a free slot under a one-card task when a nearby photo makes the row taller', () => {
    const singleRowHeight = 82;
    const oneCardHeight = singleRowHeight - SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2;
    const box = computeSwimlaneRowBandBox(false, 1, singleRowHeight, singleRowHeight, 1);
    expect(box).toEqual({
      top: `${SWIMLANE_TASK_ROW_VERTICAL_INSET_PX + oneCardHeight}px`,
      height: `${oneCardHeight}px`,
    });
  });

  it('keeps single-row card height on the first stacked layer', () => {
    const singleRowHeight = 82;
    const oneCardHeight = singleRowHeight - SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2;
    const stackedTotal = resolveSwimlaneStackedTaskBandHeightPx(2, oneCardHeight);
    const single = computeSwimlaneRowBandBox(false, 0, singleRowHeight, singleRowHeight);
    const stacked = computeSwimlaneRowBandBox(true, 0, stackedTotal, oneCardHeight);
    expect(stacked.height).toBe(single.height);
  });

  it('keeps a gap between stacked layers', () => {
    const oneCardHeight = 82 - SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2;
    const stackedTotal = resolveSwimlaneStackedTaskBandHeightPx(2, oneCardHeight);
    const upper = computeSwimlaneRowBandBox(true, 0, stackedTotal, oneCardHeight);
    const lower = computeSwimlaneRowBandBox(true, 1, stackedTotal, oneCardHeight);
    const upperBottom =
      Number.parseFloat(String(upper.top)) + Number.parseFloat(String(upper.height));
    const lowerTop = Number.parseFloat(String(lower.top));
    expect(lowerTop - upperBottom).toBe(SWIMLANE_STACKED_LAYER_GAP_PX);
  });

  it('keeps one-card height when totalHeight is shorter than a full stacked layout', () => {
    const oneCardHeight = 82 - SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2;
    const photoStyleRowHeight =
      oneCardHeight * 3 + SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2;
    const box = computeSwimlaneRowBandBox(true, 0, photoStyleRowHeight, oneCardHeight, 1);
    expect(Number.parseFloat(String(box.height))).toBe(oneCardHeight);
  });
});
