import type { StoryPhasePosition, StoryPhasesByStory } from '@/lib/quarterlyPlans/types';

import { createQuarterlyPhaseId } from '@/lib/quarterlyPlans/storyPhaseHelpers';

export { storyPhasesPutEntries } from './storyPhasesPutEntriesHelpers';

interface StoryPhaseRow {
  duration_days: number;
  id?: string;
  phase_kind?: string | null;
  sprint_index: number;
  start_day: number;
  story_key: string;
}

export function rowsToStoryPhasesByStory(rows: StoryPhaseRow[]): StoryPhasesByStory {
  const out: StoryPhasesByStory = {};
  for (const row of rows) {
    const kind = row.phase_kind === 'discovery' ? 'discovery' : 'delivery';
    const phase: StoryPhasePosition = {
      id: row.id ?? createQuarterlyPhaseId(),
      kind,
      sprintIndex: row.sprint_index,
      startDay: row.start_day,
      durationDays: row.duration_days,
    };
    if (!out[row.story_key]) {
      out[row.story_key] = [];
    }
    out[row.story_key].push(phase);
  }
  return out;
}

