/**
 * API квартального планирования: планы, элементы, связи, участники, доступность, эпики/стори.
 */

import type {
  StoryEventsByStory,
  StoryPhasesByStory,
} from '@/lib/quarterlyPlans/types';
import type { Developer } from '@/types';
import type {
  BoardAvailabilityEvent,
  BoardAvailabilityEventType,
  TechSprintType,
} from '@/types/quarterly';

import { getPlannerBeerTrackerApi } from '../plannerBeerTrackerApiOverride';

import { fetchTeamMembersForBoard } from './teamMembers';

export async function fetchTeamMembers(boardId: number): Promise<Developer[]> {
  try {
    return await fetchTeamMembersForBoard(boardId);
  } catch (error) {
    console.error(`Failed to fetch team members for board ${boardId}:`, error);
    return [];
  }
}

/** Ответ GET /api/quarterly-plans/v2 */
export interface QuarterlyPlanV2Response {
  epicKeys: string[];
  /** Стори, скрытые из плана при сохранённом эпике */
  excludedStoryKeys?: string[];
  planId: string;
  /** Ключи родительских тикетов, у которых по плану фаза заканчивается в запрошенном спринте (для сегмента «релиз») */
  releaseInSprintKeys?: string[];
  storyEvents?: StoryEventsByStory;
  storyPhases: StoryPhasesByStory;
}

/** Опции запроса плана v2 для страницы спринта: только фазы по заданным родительским ключам в указанном спринте. */
interface FetchQuarterlyPlanV2SprintOptions {
  parentKeys: string[];
  sprintId: number;
}

/** @deprecated Квартальный план v2 не развивается. Загрузить план (эпики + фазы стори). При передаче sprintOptions — только фазы для parentKeys в этом спринте (эпики агрегируются). */
export async function fetchQuarterlyPlanV2(
  boardId: number,
  year: number,
  quarter: number,
  sprintOptions?: FetchQuarterlyPlanV2SprintOptions
): Promise<QuarterlyPlanV2Response> {
  let url = `/quarterly-plans/v2?boardId=${boardId}&year=${year}&quarter=${quarter}`;
  if (sprintOptions?.parentKeys?.length && sprintOptions.sprintId != null) {
    url += `&parentKeys=${sprintOptions.parentKeys.map(encodeURIComponent).join(',')}&sprintId=${sprintOptions.sprintId}`;
  }
  const { data } = await getPlannerBeerTrackerApi().get<QuarterlyPlanV2Response>(url);
  return data;
}

/** @deprecated Квартальный план v2 не развивается. Сохранить план. */
export async function saveQuarterlyPlanV2(
  boardId: number,
  year: number,
  quarter: number,
  epicKeys: string[],
  storyPhases: StoryPhasesByStory,
  excludedStoryKeys: string[] = [],
  storyEvents: StoryEventsByStory = {}
): Promise<{ success: boolean; planId?: string }> {
  const { data } = await getPlannerBeerTrackerApi().put<{ success: boolean; planId: string }>(
    '/quarterly-plans/v2',
    { boardId, year, quarter, epicKeys, storyPhases, storyEvents, excludedStoryKeys }
  );
  return { success: true, planId: data.planId };
}

export async function fetchBoardAvailabilityEventsForBoard(boardId: number): Promise<BoardAvailabilityEvent[]> {
  const { data } = await getPlannerBeerTrackerApi().get<{ events: BoardAvailabilityEvent[] }>(
    `/quarterly-plans/availability/board-events?boardId=${boardId}`
  );
  return data.events ?? [];
}

export async function createBoardAvailabilityEvent(options: {
  boardId: number;
  endDate: string;
  eventType: BoardAvailabilityEventType;
  memberId: string;
  memberName: string;
  sprintId?: number;
  startDate: string;
  techSprintSubtype?: TechSprintType;
}): Promise<BoardAvailabilityEvent> {
  const { data } = await getPlannerBeerTrackerApi().post<BoardAvailabilityEvent>(
    '/quarterly-plans/availability/board-events',
    options
  );
  return data;
}

export async function updateBoardAvailabilityEvent(options: {
  boardId: number;
  endDate: string;
  eventType: BoardAvailabilityEventType;
  id: string;
  memberId: string;
  memberName: string;
  sprintId?: number;
  startDate: string;
  techSprintSubtype?: TechSprintType;
}): Promise<BoardAvailabilityEvent> {
  const { data } = await getPlannerBeerTrackerApi().patch<BoardAvailabilityEvent>(
    '/quarterly-plans/availability/board-events',
    options
  );
  return data;
}

export async function deleteBoardAvailabilityEvent(options: {
  boardId: number;
  id: string;
  memberId: string;
}): Promise<{ deleted: number; success: boolean }> {
  const { boardId, id, memberId } = options;
  const { data } = await getPlannerBeerTrackerApi().delete<{ deleted: number; success: boolean }>(
    `/quarterly-plans/availability/board-events?id=${encodeURIComponent(id)}&boardId=${boardId}&memberId=${encodeURIComponent(memberId)}`
  );
  return data;
}
