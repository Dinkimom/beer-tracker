/**
 * API досок и спринтов (список досок, параметры доски, список спринтов, создание спринта).
 */

import type { BoardListItem } from './types';
import type { SprintsResponse } from '@/types';
import type { BoardParams } from '@/types/tracker';

import { loadBoardsForPlanner } from '@/lib/layers/data/repositories/boardsRepository';

import { getPlannerBeerTrackerApi } from '../plannerBeerTrackerApiOverride';

/**
 * Список досок планера (команды организации в PG). HTTP через data-слой (`loadBoardsForPlanner` → transport).
 */
export async function fetchBoards(): Promise<BoardListItem[]> {
  const result = await loadBoardsForPlanner();
  if (result.ok) {
    return result.data;
  }
  console.error('Failed to fetch boards:', result.error);
  throw result.error instanceof Error ? result.error : new Error(String(result.error));
}

/**
 * Получает параметры доски из Трекера (колонки и т.д.)
 */
export async function fetchBoard(boardId: number): Promise<BoardParams> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get(`/boards/${boardId}`);
    return data;
  } catch (error) {
    console.error(`Failed to fetch board ${boardId}:`, error);
    throw error;
  }
}

/**
 * Получает список спринтов для доски
 */
export async function fetchSprints(
  boardId: number,
  options?: { refresh?: boolean }
): Promise<SprintsResponse[]> {
  try {
    const params = new URLSearchParams({ boardId: String(boardId) });
    if (options?.refresh) {
      params.set('refresh', '1');
    }
    const { data } = await getPlannerBeerTrackerApi().get(`/sprints?${params.toString()}`);
    return data;
  } catch (error) {
    console.error(`Failed to fetch sprints for board ${boardId}:`, error);
    throw error;
  }
}

/**
 * Создаёт новый спринт
 */
export async function createSprint(sprintData: {
  boardId: number;
  endDate: string;
  name: string;
  startDate: string;
}): Promise<{ error?: string; sprint?: SprintsResponse; success: boolean }> {
  try {
    const { data } = await getPlannerBeerTrackerApi().post('/sprints', sprintData);
    return { success: true, sprint: data.sprint };
  } catch (error) {
    console.error('Failed to create sprint:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
