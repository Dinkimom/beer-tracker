import type { StoryWeekEvent } from '@/lib/quarterlyPlans/types';

import {
  createQuarterlyEventId,
  isQuarterlyStoryEventKind,
} from '@/lib/quarterlyPlans/storyEventHelpers';

function normalizeStoryEventsPutList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value != null ? [value] : [];
}

function parseStoryEventPutItem(
  storyKey: string,
  item: unknown,
  seenWeek: Set<string>
): { storyKey: string; event: StoryWeekEvent } | null {
  if (!item || typeof item !== 'object') return null;
  const e = item as Partial<StoryWeekEvent>;
  if (typeof e.weekIndex !== 'number' || !e.kind || !isQuarterlyStoryEventKind(e.kind)) {
    return null;
  }
  const dedupeKey = `${storyKey}:${e.weekIndex}`;
  if (seenWeek.has(dedupeKey)) return null;
  seenWeek.add(dedupeKey);
  return {
    storyKey,
    event: {
      id: typeof e.id === 'string' && e.id.trim() ? e.id.trim() : createQuarterlyEventId(),
      kind: e.kind,
      weekIndex: e.weekIndex,
    },
  };
}

export function storyEventsPutEntries(
  raw: unknown
): Array<{ storyKey: string; event: StoryWeekEvent }> {
  if (!raw || typeof raw !== 'object') return [];
  const entries: Array<{ storyKey: string; event: StoryWeekEvent }> = [];
  const seenWeek = new Set<string>();

  for (const [storyKey, value] of Object.entries(raw as Record<string, unknown>)) {
    for (const item of normalizeStoryEventsPutList(value)) {
      const parsed = parseStoryEventPutItem(storyKey, item, seenWeek);
      if (parsed) entries.push(parsed);
    }
  }
  return entries;
}
