import type { DragEndEvent } from '@dnd-kit/core';

import { describe, expect, it } from 'vitest';

import {
  getDragOverlayLeftX,
  getSwimlanePlacementAnchorX,
  isAnyClientXInOpenRightSidebar,
  isClientXInOpenRightSidebar,
} from './swimlaneDragMouseUtils';

function dragEventWithOverlayLeft(left: number, width = 100): DragEndEvent {
  return {
    active: {
      rect: {
        current: {
          translated: { left, width, top: 0, height: 40 },
        },
      },
    },
  } as unknown as DragEndEvent;
}

describe('getDragOverlayLeftX', () => {
  it('returns translated left edge of overlay', () => {
    expect(getDragOverlayLeftX(dragEventWithOverlayLeft(250))).toBe(250);
  });
});

describe('getSwimlanePlacementAnchorX', () => {
  it('prefers overlay left edge over cursor position', () => {
    const mouseRef = { current: { x: 400, y: 10 } };
    expect(getSwimlanePlacementAnchorX(mouseRef, dragEventWithOverlayLeft(120, 80))).toBe(120);
  });

  it('falls back to cursor when overlay geometry is unavailable', () => {
    const mouseRef = { current: { x: 400, y: 10 } };
    expect(getSwimlanePlacementAnchorX(mouseRef, undefined)).toBe(400);
  });
});

describe('isClientXInOpenRightSidebar', () => {
  it('returns true when clientX is in the right sidebar band', () => {
    expect(isClientXInOpenRightSidebar(900, 320, 1200)).toBe(true);
    expect(isClientXInOpenRightSidebar(880, 320, 1200)).toBe(true);
  });

  it('returns false when clientX is on the left timeline', () => {
    expect(isClientXInOpenRightSidebar(280, 320, 1200)).toBe(false);
    expect(isClientXInOpenRightSidebar(879, 320, 1200)).toBe(false);
  });

  it('returns true in layout gap between swimlanes content and sidebar DOM', () => {
    expect(
      isClientXInOpenRightSidebar(700, 320, 1200, {
        sidebarOpen: true,
        swimlanesContentRightEdge: 560,
      })
    ).toBe(true);
    expect(
      isClientXInOpenRightSidebar(550, 320, 1200, {
        sidebarOpen: true,
        swimlanesContentRightEdge: 560,
      })
    ).toBe(false);
  });
});

describe('isAnyClientXInOpenRightSidebar', () => {
  it('returns true if any coordinate is in the sidebar band', () => {
    expect(isAnyClientXInOpenRightSidebar([280, 950], 320, 1200)).toBe(true);
    expect(isAnyClientXInOpenRightSidebar([null, 900], 320, 1200)).toBe(true);
  });

  it('returns false when all coordinates are outside the sidebar band', () => {
    expect(isAnyClientXInOpenRightSidebar([280, 400], 320, 1200)).toBe(false);
  });
});
