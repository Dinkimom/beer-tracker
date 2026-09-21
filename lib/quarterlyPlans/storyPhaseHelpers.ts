import type { StoryPhasePosition, StoryPhasesByStory } from './types';

export function createQuarterlyPhaseId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `phase-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getStoryPhaseList(
  phasesByStory: StoryPhasesByStory,
  storyKey: string
): StoryPhasePosition[] {
  const value = phasesByStory[storyKey];
  if (!value) return [];
  return Array.isArray(value) ? value : [value as StoryPhasePosition];
}
