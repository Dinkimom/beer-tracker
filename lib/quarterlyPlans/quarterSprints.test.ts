import { describe, expect, it } from 'vitest';

import {
  buildQuarterSprintTimeline,
  filterSprintsByQuarter,
  isRegisteredQuarterlySprint,
} from './quarterSprints';

describe('buildQuarterSprintTimeline', () => {
  it('returns placeholder slots for empty quarter', () => {
    const timeline = buildQuarterSprintTimeline([], 2026, 2);
    expect(timeline.length).toBeGreaterThan(4);
    expect(timeline.every((s) => s.isUnregistered)).toBe(true);
  });

  it('keeps registered sprints and appends placeholders until quarter end', () => {
    const timeline = buildQuarterSprintTimeline(
      [
        {
          id: 1,
          name: 'Booking 2601',
          startDate: new Date(2026, 3, 6),
          endDate: new Date(2026, 3, 19),
        },
        {
          id: 2,
          name: 'Booking 2602',
          startDate: new Date(2026, 3, 20),
          endDate: new Date(2026, 4, 3),
        },
      ],
      2026,
      2
    );

    const registered = timeline.filter(isRegisteredQuarterlySprint);
    const unregistered = timeline.filter((s) => s.isUnregistered);

    expect(registered).toHaveLength(2);
    expect(registered[0]?.id).toBe(1);
    expect(registered[1]?.id).toBe(2);
    expect(unregistered.length).toBeGreaterThan(0);
    expect(timeline.at(-1)?.endDate!.getMonth()).toBeGreaterThanOrEqual(5);
  });

  it('filterSprintsByQuarter still returns only registered sprints', () => {
    const filtered = filterSprintsByQuarter(
      [
        {
          id: 10,
          name: 'S1',
          startDate: new Date(2026, 0, 5),
          endDate: new Date(2026, 0, 18),
        },
      ],
      2026,
      1
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe(10);
  });
});
