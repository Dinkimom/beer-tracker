import type { StoryEventsByStory, StoryWeekEvent } from '@/lib/quarterlyPlans/types';

import {
  createQuarterlyEventId,
  isQuarterlyStoryEventKind,
} from '@/lib/quarterlyPlans/storyEventHelpers';

export { storyEventsPutEntries } from './storyEventsPutEntriesHelpers';

interface StoryEventRow {
  event_kind: string;
  id?: string;
  sprint_index: number;
  story_key: string;
}

export function rowsToStoryEventsByStory(rows: StoryEventRow[]): StoryEventsByStory {
  const out: StoryEventsByStory = {};
  for (const row of rows) {
    if (!isQuarterlyStoryEventKind(row.event_kind)) continue;
    const event: StoryWeekEvent = {
      id: row.id ?? createQuarterlyEventId(),
      kind: row.event_kind,
      weekIndex: row.sprint_index,
    };
    if (!out[row.story_key]) {
      out[row.story_key] = [];
    }
    out[row.story_key].push(event);
  }
  for (const key of Object.keys(out)) {
    out[key].sort((a, b) => a.weekIndex - b.weekIndex);
  }
  return out;
}

