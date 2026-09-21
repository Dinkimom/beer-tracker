import { describe, expect, it } from 'vitest';

import {
  DEFAULT_NEAREST_SIDE_ANCHORS,
  anchorMidpoint,
  resolveNearestSideAnchors,
  type RectLike,
} from './nearestSideAnchors';

function rect(left: number, top: number, width: number, height: number): RectLike {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
  };
}

function positionsOf(from: RectLike, to: RectLike) {
  const pair = resolveNearestSideAnchors(from, to);
  return { from: pair.fromAnchor.position, to: pair.toAnchor.position };
}

describe('resolveNearestSideAnchors', () => {
  it('uses right→left when target is to the right on the same row', () => {
    expect(positionsOf(rect(0, 0, 100, 40), rect(200, 0, 100, 40))).toEqual({
      from: 'right',
      to: 'left',
    });
  });

  it('uses left→right when target is to the left on the same row', () => {
    expect(positionsOf(rect(200, 0, 100, 40), rect(0, 0, 100, 40))).toEqual({
      from: 'left',
      to: 'right',
    });
  });

  it('uses bottom→top when target is directly below', () => {
    expect(positionsOf(rect(0, 0, 100, 40), rect(0, 100, 100, 40))).toEqual({
      from: 'bottom',
      to: 'top',
    });
  });

  it('uses top→bottom when target is directly above', () => {
    expect(positionsOf(rect(0, 100, 100, 40), rect(0, 0, 100, 40))).toEqual({
      from: 'top',
      to: 'bottom',
    });
  });

  it('picks facing sides for a diagonal layout with horizontal dominance', () => {
    expect(positionsOf(rect(0, 0, 80, 40), rect(120, 80, 80, 40))).toEqual({
      from: 'right',
      to: 'left',
    });
  });

  it('prefers bottom→top when target is mostly below with horizontal overlap', () => {
    expect(positionsOf(rect(0, 0, 100, 40), rect(10, 80, 100, 40))).toEqual({
      from: 'bottom',
      to: 'top',
    });
  });

  it('does not pick parallel sides when cards are side by side', () => {
    const pair = resolveNearestSideAnchors(rect(0, 0, 100, 40), rect(120, 0, 100, 40));
    expect(pair.fromAnchor.position).not.toBe(pair.toAnchor.position);
  });

  it('picks right→left for heavily overlapping cards when target is slightly to the right', () => {
    expect(positionsOf(rect(0, 0, 100, 40), rect(10, 5, 100, 40))).toEqual({
      from: 'right',
      to: 'left',
    });
  });

  it('picks nearest midpoints even for a perpendicular pair', () => {
    // bottom→left ближе, чем right→left / bottom→top.
    expect(positionsOf(rect(0, 0, 200, 40), rect(150, 80, 100, 40))).toEqual({
      from: 'bottom',
      to: 'left',
    });
  });

  it('anchors at side midpoints', () => {
    const from = rect(0, 0, 100, 40);
    const to = rect(200, 0, 100, 40);
    const pair = resolveNearestSideAnchors(from, to);
    expect(pair.fromAnchor.position).toBe('right');
    expect(pair.toAnchor.position).toBe('left');
    expect(pair.fromAnchor.offset).toEqual({ x: 0, y: 0 });
    expect(pair.toAnchor.offset).toEqual({ x: 0, y: 0 });
    expect(anchorMidpoint(from, 'right')).toEqual({ x: 100, y: 20 });
    expect(anchorMidpoint(to, 'left')).toEqual({ x: 200, y: 20 });
  });

  it('exposes right→left as the default fallback pair', () => {
    expect(DEFAULT_NEAREST_SIDE_ANCHORS.fromAnchor.position).toBe('right');
    expect(DEFAULT_NEAREST_SIDE_ANCHORS.toAnchor.position).toBe('left');
  });
});
