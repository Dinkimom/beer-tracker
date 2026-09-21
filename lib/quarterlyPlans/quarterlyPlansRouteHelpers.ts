import type { StoryPhasePosition, StoryPhasesByStory } from '@/lib/quarterlyPlans/types';
import type { Quarter } from '@/types/quarterly';
import type { AxiosInstance } from 'axios';
import type { NextRequest } from 'next/server';

import { getTrackerApiFromRequest } from '@/lib/api-tracker';
import { WORKING_DAYS_PER_SPRINT, filterSprintsByQuarter } from '@/lib/quarterlyPlans/quarterSprints';
import { getStoryPhaseList } from '@/lib/quarterlyPlans/storyPhaseHelpers';
import { fetchEpicStories } from '@/lib/trackerApi/issues';

export function clipPhaseToSprint(
  phase: StoryPhasePosition,
  sprintIndexInQuarter: number
): StoryPhasePosition | null {
  const phaseStartQ = phase.sprintIndex * WORKING_DAYS_PER_SPRINT + phase.startDay;
  const phaseEndQ = phaseStartQ + phase.durationDays - 1;
  const sprintStartQ = sprintIndexInQuarter * WORKING_DAYS_PER_SPRINT;
  const sprintEndQ = sprintStartQ + WORKING_DAYS_PER_SPRINT - 1;
  const segStart = Math.max(phaseStartQ, sprintStartQ);
  const segEnd = Math.min(phaseEndQ, sprintEndQ);
  if (segStart > segEnd) return null;
  const durationDays = segEnd - segStart + 1;
  const startDay = segStart - sprintStartQ;
  return {
    id: phase.id,
    kind: phase.kind,
    sprintIndex: sprintIndexInQuarter,
    startDay,
    durationDays,
  };
}

function mergeClippedSegments(
  segments: StoryPhasePosition[],
  sprintIndexInQuarter: number
): StoryPhasePosition | null {
  if (segments.length === 0) return null;
  const minStart = Math.min(...segments.map((p) => p.startDay));
  const maxEnd = Math.max(...segments.map((p) => p.startDay + p.durationDays));
  return {
    id: segments[0].id,
    kind: segments[0].kind,
    sprintIndex: sprintIndexInQuarter,
    startDay: minStart,
    durationDays: Math.max(1, maxEnd - minStart),
  };
}

function computePhaseEndQ(phase: StoryPhasePosition): number {
  return phase.sprintIndex * WORKING_DAYS_PER_SPRINT + phase.startDay + phase.durationDays - 1;
}

function collectStoryPhaseSegments(
  storyKey: string,
  storyPhases: StoryPhasesByStory,
  sprintIndexInQuarter: number,
  sprintEndQ: number
): { releaseInSprint: boolean; segments: StoryPhasePosition[] } {
  const segments: StoryPhasePosition[] = [];
  let releaseInSprint = false;
  for (const phase of getStoryPhaseList(storyPhases, storyKey)) {
    if (computePhaseEndQ(phase) <= sprintEndQ) releaseInSprint = true;
    const segment = clipPhaseToSprint(phase, sprintIndexInQuarter);
    if (segment) segments.push(segment);
  }
  return { releaseInSprint, segments };
}

function collectEpicStorySegments(
  stories: Awaited<ReturnType<typeof fetchEpicStories>>,
  storyPhases: StoryPhasesByStory,
  sprintIndexInQuarter: number,
  sprintEndQ: number
): { releaseInSprint: boolean; segments: StoryPhasePosition[] } {
  const segments: StoryPhasePosition[] = [];
  let releaseInSprint = false;
  for (const story of stories) {
    const key = story.key;
    if (!key) continue;
    const storyResult = collectStoryPhaseSegments(key, storyPhases, sprintIndexInQuarter, sprintEndQ);
    if (storyResult.releaseInSprint) releaseInSprint = true;
    segments.push(...storyResult.segments);
  }
  return { releaseInSprint, segments };
}

async function aggregateEpicPhase(
  epicKey: string,
  boardId: number,
  storyPhases: StoryPhasesByStory,
  sprintIndexInQuarter: number,
  sprintEndQ: number,
  request: NextRequest,
  trackerApiOverride?: AxiosInstance
): Promise<{ releaseInSprint: boolean; segment: StoryPhasePosition } | null> {
  try {
    const trackerApi = trackerApiOverride ?? (await getTrackerApiFromRequest(request));
    const stories = await fetchEpicStories(epicKey, boardId, trackerApi);
    const { releaseInSprint, segments } = collectEpicStorySegments(
      stories,
      storyPhases,
      sprintIndexInQuarter,
      sprintEndQ
    );
    const merged = mergeClippedSegments(segments, sprintIndexInQuarter);
    if (!merged) return null;
    return { segment: merged, releaseInSprint };
  } catch (err) {
    console.warn('[quarterly-plans/v2] aggregate epic phase for', epicKey, err);
    return null;
  }
}

function clipAndMergePhasesForKey(
  phasesForKey: StoryPhasePosition[],
  sprintIndexInQuarter: number
): StoryPhasePosition | null {
  const clipped = phasesForKey
    .map((phase) => clipPhaseToSprint(phase, sprintIndexInQuarter))
    .filter((s): s is StoryPhasePosition => s != null);
  return mergeClippedSegments(clipped, sprintIndexInQuarter);
}

function hasReleaseInSprint(phasesForKey: StoryPhasePosition[], sprintEndQ: number): boolean {
  return phasesForKey.some((phase) => computePhaseEndQ(phase) <= sprintEndQ);
}

async function filterParentKeyForSprint(
  key: string,
  phasesForKey: StoryPhasePosition[],
  epicKeysSet: Set<string>,
  boardIdNum: number,
  allStoryPhases: StoryPhasesByStory,
  sprintIndexInQuarter: number,
  sprintEndQ: number,
  request: NextRequest,
  trackerApiOverride?: AxiosInstance
): Promise<{ key: string; releaseInSprint: boolean; segment: StoryPhasePosition } | null> {
  if (phasesForKey.length > 0) {
    const merged = clipAndMergePhasesForKey(phasesForKey, sprintIndexInQuarter);
    if (merged) {
      return {
        key,
        segment: merged,
        releaseInSprint: hasReleaseInSprint(phasesForKey, sprintEndQ),
      };
    }
  }
  if (!epicKeysSet.has(key)) return null;
  const result = await aggregateEpicPhase(
    key,
    boardIdNum,
    allStoryPhases,
    sprintIndexInQuarter,
    sprintEndQ,
    request,
    trackerApiOverride
  );
  if (!result) return null;
  return {
    key,
    segment: result.segment,
    releaseInSprint: result.releaseInSprint,
  };
}

async function collectFilteredStoryPhasesForSprint(
  parentKeys: string[],
  allStoryPhases: StoryPhasesByStory,
  epicKeysSet: Set<string>,
  boardIdNum: number,
  sprintIndexInQuarter: number,
  sprintEndQ: number,
  request: NextRequest,
  trackerApiOverride?: AxiosInstance
): Promise<{ releaseInSprintKeys: string[]; storyPhases: StoryPhasesByStory }> {
  const filtered: StoryPhasesByStory = {};
  const releaseInSprintKeys: string[] = [];

  for (const key of parentKeys) {
    const phasesForKey = getStoryPhaseList(allStoryPhases, key);
    const filteredEntry = await filterParentKeyForSprint(
      key,
      phasesForKey,
      epicKeysSet,
      boardIdNum,
      allStoryPhases,
      sprintIndexInQuarter,
      sprintEndQ,
      request,
      trackerApiOverride
    );
    if (!filteredEntry) continue;
    filtered[key] = [filteredEntry.segment];
    if (filteredEntry.releaseInSprint) releaseInSprintKeys.push(key);
  }

  return { releaseInSprintKeys, storyPhases: filtered };
}

export async function buildFilteredStoryPhasesForSprint(
  parentKeys: string[],
  sprintIdNum: number,
  boardIdNum: number,
  yearNum: number,
  quarterNum: Quarter,
  allStoryPhases: StoryPhasesByStory,
  epicKeys: string[],
  allSprintsForQuarter: Array<{ endDate: string; id: number; name?: string; startDate: string }>,
  request: NextRequest,
  trackerApiOverride?: AxiosInstance
): Promise<{ releaseInSprintKeys: string[]; storyPhases: StoryPhasesByStory }> {
  const quarterSprints = filterSprintsByQuarter(allSprintsForQuarter, yearNum, quarterNum);
  const sprintIndexInQuarter = quarterSprints.findIndex((s) => s.id === sprintIdNum);
  if (sprintIndexInQuarter < 0) {
    return { releaseInSprintKeys: [], storyPhases: {} };
  }

  const sprintEndQ = sprintIndexInQuarter * WORKING_DAYS_PER_SPRINT + WORKING_DAYS_PER_SPRINT - 1;
  const epicKeysSet = new Set(epicKeys);

  return await collectFilteredStoryPhasesForSprint(
    parentKeys,
    allStoryPhases,
    epicKeysSet,
    boardIdNum,
    sprintIndexInQuarter,
    sprintEndQ,
    request,
    trackerApiOverride
  );
}
