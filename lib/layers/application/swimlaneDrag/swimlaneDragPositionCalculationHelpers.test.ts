/**
 * Клик без перемещения не должен сдвигать карточку: якорь — левый край overlay, не центр.
 */

import type { DragEndEvent } from '@dnd-kit/core';

import { describe, expect, it } from 'vitest';

import { calculateCellFromMouse } from '@/lib/swimlane/swimlaneCellFromGeometry';

import { getSwimlanePlacementAnchorX } from './swimlaneDragMouseUtils';

function domRect(left: number, width: number): DOMRect {
  return {
    bottom: 0,
    height: 40,
    left,
    right: left + width,
    toJSON: () => '',
    top: 0,
    width,
    x: left,
    y: 0,
  } as DOMRect;
}

describe('swimlane placement anchor on click-release', () => {
  it('uses overlay left edge so a 2-slot card stays at start cell', () => {
    const swimlaneLeft = 100;
    const swimlaneWidth = 900;
    const workingDaysCount = 5;
    const totalCells = workingDaysCount * 3;
    const cellWidth = swimlaneWidth / totalCells;
    const cardWidth = cellWidth * 2;

    const cardLeft = swimlaneLeft;
    const event = {
      active: {
        rect: {
          current: {
            translated: domRect(cardLeft, cardWidth),
          },
        },
      },
    } as unknown as DragEndEvent;

    const anchorX = getSwimlanePlacementAnchorX({ current: null }, event);
    expect(anchorX).toBe(cardLeft);

    const cellFromAnchor = calculateCellFromMouse(
      anchorX!,
      domRect(swimlaneLeft, swimlaneWidth),
      2,
      undefined,
      workingDaysCount
    );
    const cellFromOverlayCenter = calculateCellFromMouse(
      cardLeft + cardWidth / 2,
      domRect(swimlaneLeft, swimlaneWidth),
      2,
      undefined,
      workingDaysCount
    );

    expect(cellFromAnchor).toEqual({ day: 0, part: 0 });
    expect(cellFromOverlayCenter).toEqual({ day: 0, part: 1 });
  });
});
