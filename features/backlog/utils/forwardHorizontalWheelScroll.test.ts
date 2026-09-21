import { describe, expect, it } from 'vitest';

import {
  applyHorizontalWheelDelta,
  resolveHorizontalWheelDelta,
  shouldPreventHorizontalWheelDefault,
} from './forwardHorizontalWheelScroll';

describe('resolveHorizontalWheelDelta', () => {
  it('uses deltaX for trackpad sideways swipe', () => {
    expect(resolveHorizontalWheelDelta({ deltaX: 40, deltaY: 0, shiftKey: false })).toBe(40);
  });

  it('maps shift+vertical wheel to horizontal', () => {
    expect(resolveHorizontalWheelDelta({ deltaX: 0, deltaY: 30, shiftKey: true })).toBe(30);
  });

  it('prefers deltaX when shift is held with both deltas', () => {
    expect(resolveHorizontalWheelDelta({ deltaX: 12, deltaY: 30, shiftKey: true })).toBe(12);
  });
});

describe('applyHorizontalWheelDelta', () => {
  it('scrolls within bounds and reports applied', () => {
    const scroller = { clientWidth: 100, scrollLeft: 20, scrollWidth: 300 };
    expect(applyHorizontalWheelDelta(scroller, 50)).toBe(true);
    expect(scroller.scrollLeft).toBe(70);
  });

  it('clamps to the right edge', () => {
    const scroller = { clientWidth: 100, scrollLeft: 180, scrollWidth: 300 };
    expect(applyHorizontalWheelDelta(scroller, 50)).toBe(true);
    expect(scroller.scrollLeft).toBe(200);
  });

  it('returns false when already at the edge', () => {
    const scroller = { clientWidth: 100, scrollLeft: 0, scrollWidth: 300 };
    expect(applyHorizontalWheelDelta(scroller, -10)).toBe(false);
    expect(scroller.scrollLeft).toBe(0);
  });

  it('returns false when content fits without overflow', () => {
    const scroller = { clientWidth: 300, scrollLeft: 0, scrollWidth: 300 };
    expect(applyHorizontalWheelDelta(scroller, 40)).toBe(false);
  });
});

describe('shouldPreventHorizontalWheelDefault', () => {
  it('prevents for pure horizontal gestures', () => {
    expect(
      shouldPreventHorizontalWheelDefault({ deltaX: 40, deltaY: 0, shiftKey: false })
    ).toBe(true);
  });

  it('prevents for shift+wheel', () => {
    expect(
      shouldPreventHorizontalWheelDefault({ deltaX: 0, deltaY: 20, shiftKey: true })
    ).toBe(true);
  });

  it('prevents when horizontal delta dominates (trackpad noise on Y)', () => {
    expect(
      shouldPreventHorizontalWheelDefault({ deltaX: 40, deltaY: 8, shiftKey: false })
    ).toBe(true);
  });

  it('keeps default when vertical delta dominates', () => {
    expect(
      shouldPreventHorizontalWheelDefault({ deltaX: 8, deltaY: 40, shiftKey: false })
    ).toBe(false);
  });
});
