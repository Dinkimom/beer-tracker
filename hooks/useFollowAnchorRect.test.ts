import { describe, expect, it, vi } from 'vitest';

import {
  QUICK_ADD_MENU_MIN_WIDTH_PX,
  computeAnchoredPanelPosition,
  computeQuickAddMenuCaretLeft,
  resolveQuickAddPopoverCollision,
} from './useFollowAnchorRect';

describe('resolveQuickAddPopoverCollision', () => {
  it('places the menu below the card when there is more room underneath', () => {
    expect(resolveQuickAddPopoverCollision({ top: 80, bottom: 140 }, 800)).toEqual({
      maxHeight: 800 - 140 - 8 - 6,
      side: 'bottom',
    });
  });

  it('prefers below even when there is more room above, as long as the menu fits', () => {
    expect(resolveQuickAddPopoverCollision({ top: 400, bottom: 460 }, 800)).toEqual({
      maxHeight: 800 - 460 - 8 - 6,
      side: 'bottom',
    });
  });

  it('places the menu above the card when there is not enough room underneath', () => {
    expect(resolveQuickAddPopoverCollision({ top: 640, bottom: 720 }, 800)).toEqual({
      maxHeight: 640 - 8 - 6,
      side: 'top',
    });
  });

  it('stays below when neither side fits and below has more room', () => {
    expect(resolveQuickAddPopoverCollision({ top: 80, bottom: 700 }, 800, 220)).toEqual({
      maxHeight: 800 - 700 - 8 - 6,
      side: 'bottom',
    });
  });
});

describe('computeAnchoredPanelPosition', () => {
  it('uses fixed min width independent of narrow anchor', () => {
    vi.stubGlobal('window', { innerHeight: 800, innerWidth: 1200 });

    const anchor = {
      bottom: 100,
      height: 24,
      left: 50,
      right: 90,
      top: 76,
      width: 40,
      x: 50,
      y: 76,
      toJSON: () => ({}),
    } as DOMRect;

    const pos = computeAnchoredPanelPosition(anchor);
    expect(pos.width).toBe(QUICK_ADD_MENU_MIN_WIDTH_PX);
    expect(pos.left).toBe(50);
    expect(pos.placement).toBe('below');

    vi.unstubAllGlobals();
  });
});

describe('computeQuickAddMenuCaretLeft', () => {
  it('points near anchor center within panel bounds', () => {
    const anchor = {
      bottom: 100,
      height: 24,
      left: 100,
      right: 140,
      top: 76,
      width: 40,
      x: 100,
      y: 76,
      toJSON: () => ({}),
    } as DOMRect;

    const caretLeft = computeQuickAddMenuCaretLeft(anchor, 80, QUICK_ADD_MENU_MIN_WIDTH_PX);
    expect(caretLeft).toBeGreaterThanOrEqual(12);
    expect(caretLeft).toBeLessThanOrEqual(QUICK_ADD_MENU_MIN_WIDTH_PX - 24);
  });
});
