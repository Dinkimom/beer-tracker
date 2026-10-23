import type { Task, TaskPosition } from '@/types';

import { afterEach, describe, expect, it } from 'vitest';

import { placeSwimlaneLayerItems } from './layerUtils';
import {
  collectSwimlaneArrangeWrites,
  collectSwimlaneAutoLayerWrites,
  registerSwimlaneLaneLayout,
  resolveRegisteredSwimlaneCardDrop,
  resolveSwimlaneCardDropInLane,
} from './swimlaneLaneLayoutRegistry';

function card(id: string, startPart: number, duration: number) {
  const position: TaskPosition = { assignee: 'dev', duration, startDay: 0, startPart, taskId: id };
  return { position, task: { id, link: '', name: id, status: 'todo' } as Task };
}

const unregister: Array<() => void> = [];

afterEach(() => {
  unregister.splice(0).forEach((fn) => fn());
});

describe('resolveSwimlaneCardDropInLane', () => {
  const lane = [card('a', 0, 4), card('b', 0, 4), card('far', 10, 2)];
  const placed = placeSwimlaneLayerItems(lane);
  const layers = (writes: ReadonlyArray<{ cardId: string; layer: number | null }>) =>
    Object.fromEntries(writes.map(({ cardId, layer }) => [cardId, layer]));

  it('keeps the target layer when it is free and leaves the neighbours alone', () => {
    const drop = resolveSwimlaneCardDropInLane({ cardId: 'x', placed, position: card('x', 6, 2).position, targetTopLayer: 1 });
    expect(drop.layer).toBe(1);
    expect(layers(drop.writes)).toEqual({ a: 0, b: 1, far: 0, x: 1 });
  });

  it('inserts at the very top and pushes only the overlapping cards down', () => {
    const drop = resolveSwimlaneCardDropInLane({ cardId: 'x', placed, position: card('x', 1, 2).position, targetTopLayer: 0 });
    expect(drop.layer).toBe(0);
    expect(layers(drop.writes)).toEqual({ a: 1, b: 2, far: 0, x: 0 });
  });

  it('goes under the card when aimed at the lower half of its row', () => {
    const drop = resolveSwimlaneCardDropInLane({ cardId: 'x', placed, position: card('x', 1, 2).position, targetTopLayer: 1.5 });
    expect(layers(drop.writes)).toEqual({ a: 0, b: 1, far: 0, x: 2 });
    expect(drop.layer).toBe(2);
  });

  it('inserts between two stacked cards', () => {
    const drop = resolveSwimlaneCardDropInLane({ cardId: 'x', placed, position: card('x', 1, 2).position, targetTopLayer: 1 });
    expect(layers(drop.writes)).toEqual({ a: 0, b: 2, far: 0, x: 1 });
  });

  it('does not leave empty rows below the lane', () => {
    const drop = resolveSwimlaneCardDropInLane({ cardId: 'a', placed, position: card('a', 6, 2).position, targetTopLayer: 5 });
    expect(layers(drop.writes)).toEqual({ a: 2, b: 1, far: 0 });
  });

  it('collapses the row a card leaves once nothing else is in it', () => {
    const solo = placeSwimlaneLayerItems([card('a', 0, 4), card('b', 0, 4)]);
    const drop = resolveSwimlaneCardDropInLane({ cardId: 'a', placed: solo, position: card('a', 6, 2).position, targetTopLayer: 1 });
    expect(layers(drop.writes)).toEqual({ a: 0, b: 0 });
  });
});

describe('resolveRegisteredSwimlaneCardDrop', () => {
  it('packs the card as the lane will show it at the new spot (e.g. with its overdue tail)', () => {
    const placed = placeSwimlaneLayerItems([card('a', 4, 2)]);
    const moved = card('x', 0, 2);
    unregister.push(
      registerSwimlaneLaneLayout('dev', {
        computeAuto: () => placed,
        packItem: (cardId, position) => ({
          baseline: { end: 6, start: 2 },
          id: cardId,
          isQuickAddDraft: false,
          layerShiftUp: 0,
          position,
          span: 1,
          startCell: 0,
        }),
        placed,
      })
    );
    const drop = resolveRegisteredSwimlaneCardDrop({ cardId: 'x', laneId: 'dev', position: moved.position, targetTopLayer: 0 });
    expect(drop.layer).toBe(0);
    expect(drop.writes).toContainEqual({ cardId: 'a', layer: 1 });
  });
});

describe('registry', () => {
  it('resolves against the registered lane and lists cards still placed automatically', () => {
    const placed = placeSwimlaneLayerItems([card('a', 0, 4), card('local-task-1', 0, 1)]);
    unregister.push(registerSwimlaneLaneLayout('dev', { computeAuto: () => placed, placed }));

    expect(
      resolveRegisteredSwimlaneCardDrop({ cardId: 'x', laneId: 'dev', position: card('x', 2, 1).position, targetTopLayer: 0 })
        .layer
    ).toBe(0);
    expect(collectSwimlaneAutoLayerWrites(new Map())).toEqual([{ cardId: 'a', layer: 0 }]);
    expect(collectSwimlaneAutoLayerWrites(new Map([['a', 0]]))).toEqual([]);
  });

  it('arranges every registered lane by the auto layout', () => {
    const lane = [card('a', 0, 4), card('b', 4, 2)];
    const manual = placeSwimlaneLayerItems(lane, [], undefined, new Map([['b', { layer: 3, rev: 0 }]]));
    unregister.push(
      registerSwimlaneLaneLayout('dev', { computeAuto: () => placeSwimlaneLayerItems(lane), placed: manual })
    );
    expect(collectSwimlaneArrangeWrites()).toEqual([
      { cardId: 'a', layer: 0 },
      { cardId: 'b', layer: 0 },
    ]);
  });
});
