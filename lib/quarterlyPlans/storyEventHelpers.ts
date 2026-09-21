import type { QuarterlyStoryEventKind } from './types';

const QUARTERLY_STORY_EVENT_KINDS = new Set<QuarterlyStoryEventKind>([
  'delivery_as_planned',
  'discovery_as_planned',
  'not_taken_on_time',
  'release_expected_this_week',
  'slipped_new_expected',
  'task_released',
]);

export function createQuarterlyEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `event-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isQuarterlyStoryEventKind(value: string): value is QuarterlyStoryEventKind {
  return QUARTERLY_STORY_EVENT_KINDS.has(value as QuarterlyStoryEventKind);
}
