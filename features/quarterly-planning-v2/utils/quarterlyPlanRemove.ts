import type { StoryEventsByStory, StoryPhasesByStory } from '../types';
import type { Task } from '@/types';

import { purgeStoryEventsForKeys } from './storyEventsMap';

interface QuarterlyPlanRemoveState {
  excludedStoryKeys: string[];
  planEpicKeys: string[];
  storyEvents: StoryEventsByStory;
  storyPhases: StoryPhasesByStory;
}

type QuarterlyPlanRemoveResult = QuarterlyPlanRemoveState

function resolveEpicKeyForStory(task: Task): string | undefined {
  const key = task.parent?.key?.trim();
  if (key) return key;
  const id = task.parent?.id?.trim();
  if (id) return id;
  return undefined;
}

function storyKeysUnderEpic(epicKey: string, tasks: Task[]): string[] {
  return tasks
    .filter((t) => resolveEpicKeyForStory(t) === epicKey)
    .map((t) => t.id);
}

function purgePhasesForKeys(
  storyPhases: StoryPhasesByStory,
  keys: Iterable<string>
): StoryPhasesByStory {
  const next = { ...storyPhases };
  for (const key of keys) {
    delete next[key];
  }
  return next;
}

/** Убрать эпик и все его стори/фазы из плана. */
export function removeEpicFromQuarterlyPlan(
  state: QuarterlyPlanRemoveState,
  epicKey: string,
  tasks: Task[]
): QuarterlyPlanRemoveResult {
  const storyKeys = storyKeysUnderEpic(epicKey, tasks);
  const keysToPurge = new Set([epicKey, ...storyKeys]);

  return {
    planEpicKeys: state.planEpicKeys.filter((k) => k !== epicKey),
    storyPhases: purgePhasesForKeys(state.storyPhases, keysToPurge),
    storyEvents: purgeStoryEventsForKeys(state.storyEvents, keysToPurge),
    excludedStoryKeys: state.excludedStoryKeys.filter((k) => !keysToPurge.has(k)),
  };
}

/** Убрать стори из плана (эпик остаётся). */
export function removeStoryFromQuarterlyPlan(
  state: QuarterlyPlanRemoveState,
  storyKey: string
): QuarterlyPlanRemoveResult {
  const excluded = state.excludedStoryKeys.includes(storyKey)
    ? state.excludedStoryKeys
    : [...state.excludedStoryKeys, storyKey];
  const storyPhases = { ...state.storyPhases };
  delete storyPhases[storyKey];
  const storyEvents = { ...state.storyEvents };
  delete storyEvents[storyKey];
  return {
    planEpicKeys: state.planEpicKeys,
    storyPhases,
    storyEvents,
    excludedStoryKeys: excluded,
  };
}

/**
 * Удаление строки планера: стори с родителем — исключение; эпик без родителя — из planEpicKeys.
 */
export function removeTaskFromQuarterlyPlan(
  state: QuarterlyPlanRemoveState,
  task: Task,
  tasks: Task[]
): QuarterlyPlanRemoveResult {
  const epicKey = resolveEpicKeyForStory(task);
  if (epicKey && state.planEpicKeys.includes(epicKey)) {
    return removeStoryFromQuarterlyPlan(state, task.id);
  }
  if (state.planEpicKeys.includes(task.id)) {
    return removeEpicFromQuarterlyPlan(state, task.id, tasks);
  }
  return removeStoryFromQuarterlyPlan(state, task.id);
}
