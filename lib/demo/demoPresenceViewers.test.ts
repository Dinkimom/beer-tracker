import { describe, expect, it } from 'vitest';

import { buildDemoQuarterPresenceViewers } from './demoPresenceViewers';
import { buildDemoQuarterlyPlanContent } from './demoQuarterlyPlanSeed';

describe('buildDemoQuarterPresenceViewers', () => {
  it('points every colleague at a bar or a note that the demo quarter plan has', () => {
    const plan = buildDemoQuarterlyPlanContent({ quarter: 4, year: 2026 });
    const targets = new Set([...plan.assignments, ...plan.notes].map((item) => item.id));
    const viewers = buildDemoQuarterPresenceViewers();

    expect(viewers.map((viewer) => viewer.focus?.state)).toEqual(['resizing', 'editing', 'viewing']);
    for (const viewer of viewers) expect(targets.has(viewer.focus!.targetId)).toBe(true);
  });
});
