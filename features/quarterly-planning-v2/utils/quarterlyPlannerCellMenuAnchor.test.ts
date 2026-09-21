import { describe, expect, it } from 'vitest';

import { readCellMenuAnchor } from './quarterlyPlannerCellMenuAnchor';

describe('readCellMenuAnchor', () => {
  it('reads bottom-right corner from element rect', () => {
    const el = {
      getBoundingClientRect: () => ({
        right: 320,
        bottom: 180,
        top: 140,
        left: 240,
        width: 80,
        height: 40,
        x: 240,
        y: 140,
        toJSON: () => ({}),
      }),
    } as HTMLElement;

    expect(readCellMenuAnchor(el)).toEqual({ anchorRight: 320, anchorBottom: 180 });
  });
});
