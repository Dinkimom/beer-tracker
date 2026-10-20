import { describe, expect, it } from 'vitest';

import { restrictTransformToTimelineBounds } from './swimlaneDragOverlayRestrict';

function rect(left: number, width: number) {
  return {
    bottom: 40,
    height: 40,
    left,
    right: left + width,
    top: 0,
    width,
  };
}

describe('restrictTransformToTimelineBounds', () => {
  const identity = { scaleX: 1, scaleY: 1, x: 0, y: 0 };

  it('does not move a card already inside the timeline', () => {
    expect(
      restrictTransformToTimelineBounds(identity, rect(120, 80), { left: 100, right: 500 })
    ).toEqual(identity);
  });

  it('pulls a card back when it would leave the right edge', () => {
    const next = restrictTransformToTimelineBounds(
      { ...identity, x: 200 },
      rect(300, 100),
      { left: 100, right: 500 }
    );
    // 300+200+100 = 600 → clamp so right = 500 → x = 100
    expect(next.x).toBe(100);
  });

  it('pulls a card forward when it would leave the left edge', () => {
    const next = restrictTransformToTimelineBounds(
      { ...identity, x: -50 },
      rect(120, 80),
      { left: 100, right: 500 }
    );
    expect(next.x).toBe(-20);
  });

  it('returns transform unchanged without bounds or rect', () => {
    expect(restrictTransformToTimelineBounds(identity, null, { left: 0, right: 10 })).toEqual(
      identity
    );
    expect(restrictTransformToTimelineBounds(identity, rect(0, 10), null)).toEqual(identity);
  });
});
