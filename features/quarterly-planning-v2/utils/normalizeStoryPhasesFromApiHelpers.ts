import type { StoryPhasePosition, StoryPhasesByStory } from '../types';
import type { QuarterlyPlanPhaseKind } from '../types';

function isValidStoryPhasePosition(
  phase: StoryPhasePosition | null | undefined
): phase is StoryPhasePosition {
  return (
    phase != null &&
    typeof phase.sprintIndex === 'number' &&
    typeof phase.startDay === 'number' &&
    typeof phase.durationDays === 'number'
  );
}

function normalizeSinglePhaseFromApi(
  storyKey: string,
  raw: Partial<StoryPhasePosition> & {
    durationDays: number;
    sprintIndex: number;
    startDay: number;
  }
): StoryPhasePosition {
  const kind: QuarterlyPlanPhaseKind =
    raw.kind === 'discovery' ? 'discovery' : 'delivery';
  return {
    id: raw.id?.trim() || `${storyKey}-${kind}`,
    kind,
    sprintIndex: raw.sprintIndex,
    startDay: raw.startDay,
    durationDays: raw.durationDays,
  };
}

function normalizeStoryPhasesEntry(
  storyKey: string,
  value: StoryPhasePosition | StoryPhasePosition[] | undefined
): StoryPhasePosition[] | null {
  if (!value) return null;
  const list = Array.isArray(value) ? value : [value];
  const phases = list
    .filter(isValidStoryPhasePosition)
    .map((phase) => normalizeSinglePhaseFromApi(storyKey, phase));
  return phases.length > 0 ? phases : null;
}

export function applyNormalizedStoryPhasesEntry(
  out: StoryPhasesByStory,
  storyKey: string,
  value: StoryPhasePosition | StoryPhasePosition[] | undefined
): void {
  const phases = normalizeStoryPhasesEntry(storyKey, value);
  if (phases) {
    out[storyKey] = phases;
  }
}
