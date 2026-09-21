import type { BurndownDayChangelogItem } from './types';
import type { SprintTimelineTotals } from '@/lib/burndown/taskChangelogTimeline';
import type { BacklogResponse } from '@/types';

import { getPlannerBeerTrackerApi } from '../plannerBeerTrackerApiOverride';

/**
 * Получает задачи бэклога для доски
 */
export async function fetchBacklog(
  boardId: number,
  page: number = 1,
  perPage: number = 50
): Promise<BacklogResponse> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get(
      `/backlog?boardId=${boardId}&page=${page}&perPage=${perPage}`
    );
    return data;
  } catch (error) {
    console.error(`Failed to fetch backlog for board ${boardId}:`, error);
    throw error;
  }
}

/**
 * Получает данные burn-down chart для спринта
 * @param sprintId - ID спринта
 * @param boardId - ID доски (опционально)
 */
export async function fetchBurndownData(
  sprintId: number,
  boardId?: number
): Promise<{
  currentSP: number;
  currentTP: number;
  dataPoints: Array<{
    date: string;
    dateKey: string;
    remainingSP: number;
    remainingTP: number;
  }>;
  dailyChangelog: Record<string, BurndownDayChangelogItem[]>;
  initialSP: number;
  initialTP: number;
  testingFlowMode: 'embedded_in_dev' | 'standalone_qa_tasks' | 'unknown';
  sprintInfo: {
    endDate: string;
    name: string;
    startDate: string;
  };
  sprintTimelineTotals: SprintTimelineTotals;
} | null> {
  try {
    const params = boardId ? { boardId } : {};
    const { data } = await getPlannerBeerTrackerApi().get(`/sprints/${sprintId}/burndown`, {
      params,
    });
    return data;
  } catch (error) {
    console.error(`Failed to fetch burndown data for sprint ${sprintId}:`, error);
    return null;
  }
}
