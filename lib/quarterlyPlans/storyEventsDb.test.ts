import { describe, expect, it } from 'vitest';

import { rowsToStoryEventsByStory, storyEventsPutEntries } from './storyEventsDb';

describe('storyEventsDb', () => {
  it('rowsToStoryEventsByStory maps sprint_index to weekIndex', () => {
    const out = rowsToStoryEventsByStory([
      {
        id: 'e1',
        story_key: 'STORY-1',
        event_kind: 'task_released',
        sprint_index: 2,
      },
    ]);
    expect(out['STORY-1']).toEqual([
      { id: 'e1', kind: 'task_released', weekIndex: 2 },
    ]);
  });

  it('storyEventsPutEntries dedupes by story and week', () => {
    const entries = storyEventsPutEntries({
      'STORY-1': [
        { id: 'a', kind: 'delivery_as_planned', weekIndex: 1 },
        { id: 'b', kind: 'discovery_as_planned', weekIndex: 1 },
      ],
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.event.kind).toBe('delivery_as_planned');
  });
});
