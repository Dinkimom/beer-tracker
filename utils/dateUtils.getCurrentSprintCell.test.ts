import { afterEach, describe, expect, it } from 'vitest';

import { getCurrentSprintCell } from './dateUtils';
import { setPlannerNowOverride } from './plannerClock';

describe('getCurrentSprintCell', () => {
  afterEach(() => {
    setPlannerNowOverride(null);
  });

  it('uses planner clock so demo Friday is not treated as real weekend end-of-sprint', () => {
    // Sprint Tue 13 Oct 2026 …; planner "now" Fri 16 Oct noon (part 0).
    setPlannerNowOverride(new Date(2026, 9, 16, 12, 0, 0));
    const sprintStart = new Date(2026, 9, 13);
    const cell = getCurrentSprintCell(sprintStart, 3, 10);
    // Working days: 13,14,15,16 → index 3; noon → part 0 → cell 9.
    expect(cell).toBe(9);
  });
});
