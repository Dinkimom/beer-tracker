import { describe, expect, it } from 'vitest';

import { planAnchorGhostStrips } from './planAnchorGhost';

const partsPerDay = 3;

describe('planAnchorGhostStrips', () => {
  it('hides the ghost when the plan end moved by less than a day', () => {
    const strips = planAnchorGhostStrips(
      { duration: 3, segments: null, startDay: 1, startPart: 0 },
      { duration: 4, segments: undefined, startDay: 1, startPart: 0 },
      partsPerDay
    );
    expect(strips).toBeNull();
  });

  it('draws the anchor segments when the end moved by a day or more', () => {
    const strips = planAnchorGhostStrips(
      {
        duration: 6,
        segments: [
          { duration: 3, startDay: 1, startPart: 0 },
          { duration: 3, startDay: 3, startPart: 0 },
        ],
        startDay: 1,
        startPart: 0,
      },
      { duration: 6, segments: undefined, startDay: 4, startPart: 0 },
      partsPerDay
    );
    expect(strips).toEqual([
      { start: 3, width: 3 },
      { start: 9, width: 3 },
    ]);
  });
});
