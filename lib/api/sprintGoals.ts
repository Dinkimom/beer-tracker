/**
 * API целей спринта (таблица sprint_goals в beer_tracker)
 */

import type { ChecklistItem } from '@/types/tracker';

import { getPlannerBeerTrackerApi } from '../plannerBeerTrackerApiOverride';

export interface SprintGoalsResponse {
  checklistDone: number;
  checklistItems: ChecklistItem[];
  checklistTotal: number;
}

export async function fetchSprintGoals(
  sprintId: number,
  goalType: 'delivery' | 'discovery'
): Promise<SprintGoalsResponse | null> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get<SprintGoalsResponse>(
      `/sprint-goals?sprintId=${sprintId}&goalType=${goalType}`
    );
    return data ?? null;
  } catch (error) {
    console.error('Failed to fetch sprint goals:', error);
    return null;
  }
}

export async function createSprintGoal(params: {
  sprintId: number;
  goalType: 'delivery' | 'discovery';
  text: string;
  team?: string;
}): Promise<{ success: boolean; item?: ChecklistItem; error?: string }> {
  try {
    const { data } = await getPlannerBeerTrackerApi().post<{ success: boolean; item: ChecklistItem }>(
      '/sprint-goals',
      params
    );
    return { success: true, item: data?.item };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to create sprint goal:', error);
    return { success: false, error: message };
  }
}

export async function updateSprintGoal(
  id: string,
  updates: { text?: string; checked?: boolean }
): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().patch(`/sprint-goals/${encodeURIComponent(id)}`, updates);
    return true;
  } catch (error) {
    console.error('Failed to update sprint goal:', error);
    return false;
  }
}

export async function deleteSprintGoal(id: string): Promise<{ success: boolean; notFound?: boolean }> {
  try {
    const { data } = await getPlannerBeerTrackerApi().delete<{ success: boolean; notFound?: boolean }>(
      `/sprint-goals/${encodeURIComponent(id)}`
    );
    return { success: data?.success ?? true, notFound: data?.notFound };
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    console.error('Failed to delete sprint goal:', error);
    return { success: false, notFound: status === 404 };
  }
}
