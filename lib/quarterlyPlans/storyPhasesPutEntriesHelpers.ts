import type { StoryPhasePosition } from '@/lib/quarterlyPlans/types';

import { createQuarterlyPhaseId } from '@/lib/quarterlyPlans/storyPhaseHelpers';

function normalizeStoryPhasesPutList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value != null ? [value] : [];
}

function parseStoryPhasePutItem(
  storyKey: string,
  item: unknown
): { storyKey: string; phase: StoryPhasePosition } | null {
  if (!item || typeof item !== 'object') return null;
  const p = item as Partial<StoryPhasePosition>;
  if (
    typeof p.sprintIndex !== 'number' ||
    typeof p.startDay !== 'number' ||
    typeof p.durationDays !== 'number'
  ) {
    return null;
  }
  const kind = p.kind === 'discovery' ? 'discovery' : 'delivery';
  return {
    storyKey,
    phase: {
      id: typeof p.id === 'string' && p.id.trim() ? p.id.trim() : createQuarterlyPhaseId(),
      kind,
      sprintIndex: p.sprintIndex,
      startDay: p.startDay,
      durationDays: p.durationDays,
    },
  };
}

export function storyPhasesPutEntries(
  raw: unknown
): Array<{ storyKey: string; phase: StoryPhasePosition }> {
  if (!raw || typeof raw !== 'object') return [];
  const entries: Array<{ storyKey: string; phase: StoryPhasePosition }> = [];
  for (const [storyKey, value] of Object.entries(raw as Record<string, unknown>)) {
    for (const item of normalizeStoryPhasesPutList(value)) {
      const parsed = parseStoryPhasePutItem(storyKey, item);
      if (parsed) entries.push(parsed);
    }
  }
  return entries;
}
