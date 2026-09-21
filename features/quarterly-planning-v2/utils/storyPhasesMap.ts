import type {
  QuarterlyPlanPhaseKind,
  StoryPhasePosition,
  StoryPhasesByStory,
} from '../types';

import { WORKING_DAYS, WORKING_DAYS_PER_WEEK } from '@/constants';
import {
  createQuarterlyPhaseId,
  getStoryPhaseList,
} from '@/lib/quarterlyPlans/storyPhaseHelpers';

import { applyNormalizedStoryPhasesEntry } from './normalizeStoryPhasesFromApiHelpers';

export { createQuarterlyPhaseId, getStoryPhaseList };

export function quarterlyPhaseTaskId(storyKey: string, phaseId: string): string {
  return `${storyKey}::${phaseId}`;
}

export function parseQuarterlyPhaseTaskId(taskId: string): {
  phaseId: string;
  storyKey: string;
} {
  const sep = taskId.indexOf('::');
  if (sep === -1) {
    return { storyKey: taskId, phaseId: '' };
  }
  return { storyKey: taskId.slice(0, sep), phaseId: taskId.slice(sep + 2) };
}

/** Нормализует ответ API / локальный стейт (legacy: одна фаза на ключ). */
export function normalizeStoryPhasesFromApi(
  raw:
    | Record<string, StoryPhasePosition | StoryPhasePosition[] | undefined>
    | undefined
): StoryPhasesByStory {
  if (!raw) return {};
  const out: StoryPhasesByStory = {};
  for (const [storyKey, value] of Object.entries(raw)) {
    applyNormalizedStoryPhasesEntry(out, storyKey, value);
  }
  return out;
}

/** Сериализация для PUT: только валидные фазы. */
export function flattenStoryPhasesForApi(
  phasesByStory: StoryPhasesByStory
): Record<string, StoryPhasePosition[]> {
  const out: Record<string, StoryPhasePosition[]> = {};
  for (const [storyKey, phases] of Object.entries(phasesByStory)) {
    if (!phases?.length) continue;
    out[storyKey] = phases.map((p) => ({
      id: p.id,
      kind: p.kind,
      sprintIndex: p.sprintIndex,
      startDay: p.startDay,
      durationDays: p.durationDays,
    }));
  }
  return out;
}

export function hasQuarterlyPhaseKind(
  phases: StoryPhasePosition[] | undefined,
  kind: QuarterlyPlanPhaseKind
): boolean {
  return (phases ?? []).some((p) => p.kind === kind);
}

export function defaultQuarterlyPhaseAtWeek(
  weekIndex: number,
  kind: QuarterlyPlanPhaseKind
): Omit<StoryPhasePosition, 'id'> {
  const globalDay = weekIndex * WORKING_DAYS_PER_WEEK;
  return {
    kind,
    sprintIndex: Math.floor(globalDay / WORKING_DAYS),
    startDay: globalDay % WORKING_DAYS,
    durationDays: 3,
  };
}
