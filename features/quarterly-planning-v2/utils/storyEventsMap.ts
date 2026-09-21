import type { QuarterlyStoryEventKind, StoryEventsByStory, StoryWeekEvent } from '../types';

import { createQuarterlyEventId } from '@/lib/quarterlyPlans/storyEventHelpers';

import { normalizeStoryEventsEntry } from './storyEventsMapHelpers';

function getStoryEventList(
  eventsByStory: StoryEventsByStory,
  storyKey: string
): StoryWeekEvent[] {
  return eventsByStory[storyKey] ?? [];
}

export function getStoryEventForWeek(
  eventsByStory: StoryEventsByStory,
  storyKey: string,
  weekIndex: number
): StoryWeekEvent | undefined {
  return getStoryEventList(eventsByStory, storyKey).find((e) => e.weekIndex === weekIndex);
}

export function normalizeStoryEventsFromApi(raw: unknown): StoryEventsByStory {
  if (!raw || typeof raw !== 'object') return {};
  const out: StoryEventsByStory = {};
  for (const [storyKey, value] of Object.entries(raw as Record<string, unknown>)) {
    const normalized = normalizeStoryEventsEntry(storyKey, value);
    if (normalized) out[storyKey] = normalized;
  }
  return out;
}

/** Для PUT: одна запись на неделю (последняя побеждает при дублях weekIndex). */
export function flattenStoryEventsForApi(events: StoryEventsByStory): StoryEventsByStory {
  const out: StoryEventsByStory = {};
  for (const [storyKey, list] of Object.entries(events)) {
    const byWeek = new Map<number, StoryWeekEvent>();
    for (const event of list) {
      byWeek.set(event.weekIndex, event);
    }
    if (byWeek.size > 0) {
      out[storyKey] = [...byWeek.values()].sort((a, b) => a.weekIndex - b.weekIndex);
    }
  }
  return out;
}

export function upsertStoryWeekEvent(
  events: StoryEventsByStory,
  storyKey: string,
  weekIndex: number,
  kind: QuarterlyStoryEventKind
): StoryEventsByStory {
  const list = [...getStoryEventList(events, storyKey)];
  const idx = list.findIndex((e) => e.weekIndex === weekIndex);
  const nextEvent: StoryWeekEvent = {
    id: idx >= 0 ? list[idx]!.id : createQuarterlyEventId(),
    kind,
    weekIndex,
  };
  if (idx >= 0) list[idx] = nextEvent;
  else list.push(nextEvent);
  list.sort((a, b) => a.weekIndex - b.weekIndex);
  return { ...events, [storyKey]: list };
}

export function removeStoryWeekEvent(
  events: StoryEventsByStory,
  storyKey: string,
  weekIndex: number
): StoryEventsByStory {
  const list = getStoryEventList(events, storyKey).filter((e) => e.weekIndex !== weekIndex);
  const next = { ...events };
  if (list.length === 0) delete next[storyKey];
  else next[storyKey] = list;
  return next;
}

export function purgeStoryEventsForKeys(
  events: StoryEventsByStory,
  keys: Iterable<string>
): StoryEventsByStory {
  const next = { ...events };
  for (const key of keys) {
    delete next[key];
  }
  return next;
}
