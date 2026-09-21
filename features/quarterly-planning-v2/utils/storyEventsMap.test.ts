import { describe, expect, it } from 'vitest';

import {
  removeStoryWeekEvent,
  upsertStoryWeekEvent,
} from './storyEventsMap';

describe('storyEventsMap', () => {
  it('upsertStoryWeekEvent replaces event in same week', () => {
    const first = upsertStoryWeekEvent({}, 'S-1', 0, 'task_released');
    const second = upsertStoryWeekEvent(first, 'S-1', 0, 'delivery_as_planned');
    expect(second['S-1']).toHaveLength(1);
    expect(second['S-1']![0]?.kind).toBe('delivery_as_planned');
  });

  it('removeStoryWeekEvent clears week', () => {
    const withEvent = upsertStoryWeekEvent({}, 'S-1', 1, 'discovery_as_planned');
    const cleared = removeStoryWeekEvent(withEvent, 'S-1', 1);
    expect(cleared['S-1']).toBeUndefined();
  });
});
