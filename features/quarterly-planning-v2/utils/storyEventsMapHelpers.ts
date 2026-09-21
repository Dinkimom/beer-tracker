import type { QuarterlyStoryEventKind, StoryWeekEvent } from '../types';

import { isQuarterlyStoryEventKind } from './quarterlyStoryEventCatalog';

function storyEventsListFromApiValue(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value != null) {
    return [value];
  }
  return [];
}

function createNormalizedStoryEventId(rawId: unknown): string {
  if (typeof rawId === 'string' && rawId.trim()) return rawId.trim();
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `event-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeStoryWeekEventItem(item: unknown): StoryWeekEvent | null {
  if (!item || typeof item !== 'object') return null;
  const e = item as Partial<StoryWeekEvent>;
  if (typeof e.weekIndex !== 'number' || !e.kind || !isQuarterlyStoryEventKind(e.kind)) {
    return null;
  }
  return {
    id: createNormalizedStoryEventId(e.id),
    kind: e.kind as QuarterlyStoryEventKind,
    weekIndex: e.weekIndex,
  };
}

export function normalizeStoryEventsEntry(
  _storyKey: string,
  value: unknown
): StoryWeekEvent[] | null {
  const list = storyEventsListFromApiValue(value);
  const normalized = list
    .map(normalizeStoryWeekEventItem)
    .filter((event): event is StoryWeekEvent => event != null);
  return normalized.length > 0 ? normalized : null;
}
