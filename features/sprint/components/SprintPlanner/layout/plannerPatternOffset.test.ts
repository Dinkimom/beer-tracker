import { describe, expect, it } from 'vitest';

import {
  plannerPatternOffsetWithin,
  type PlannerPatternOffsetNode,
} from './plannerPatternOffset';

function node(
  offsetLeft: number,
  offsetTop: number,
  offsetParent: PlannerPatternOffsetNode | null
): PlannerPatternOffsetNode {
  return { offsetLeft, offsetParent, offsetTop };
}

describe('plannerPatternOffsetWithin', () => {
  it('returns zero when the node is the origin', () => {
    const origin = node(0, 0, null);
    expect(plannerPatternOffsetWithin(origin, origin)).toEqual({ x: 0, y: 0 });
  });

  it('sums the offsetParent chain up to the shared sheet', () => {
    const origin = node(0, 0, null);
    const row = node(220, 164, origin);
    const hatch = node(48, 0, row);
    expect(plannerPatternOffsetWithin(hatch, origin)).toEqual({ x: 268, y: 164 });
  });

  it('returns zero when offsetParent is not an offset node', () => {
    const origin = node(0, 0, null);
    const hatch = { offsetLeft: 4, offsetTop: 5, offsetParent: { tag: 'element' } };
    expect(plannerPatternOffsetWithin(hatch, origin)).toEqual({ x: 0, y: 0 });
  });

  it('returns zero when the origin is not an offsetParent', () => {
    const origin = node(0, 0, null);
    const lost = node(10, 20, null);
    expect(plannerPatternOffsetWithin(lost, origin)).toEqual({ x: 0, y: 0 });
  });

  it('rounds subpixels so emoji tiles stay sharp', () => {
    const origin = node(0, 0, null);
    const hatch = node(10.4, 20.6, origin);
    expect(plannerPatternOffsetWithin(hatch, origin)).toEqual({ x: 10, y: 21 });
  });
});
