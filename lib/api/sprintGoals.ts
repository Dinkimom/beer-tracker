/**
 * API целей спринта (таблица sprint_goals в beer_tracker)
 */

import type { SprintGoalItem, SprintGoalPlanRow } from '@/lib/sprintGoals/sprintGoalPlanRow';
import type { PlanPatchGoalPreview } from '@/lib/sprints/sprintPlanPatchGoalPreview';
import type { ChecklistItem } from '@/types/tracker';

import { getPlannerBeerTrackerApi } from '../plannerBeerTrackerApiOverride';

export interface SprintGoalsResponse {
  checklistDone: number;
  /** `planRow` — строка квартального плана цели (QG5); демо и старые ответы его не несут. */
  checklistItems: Array<ChecklistItem & Partial<Pick<SprintGoalItem, 'planRow'>>>;
  checklistTotal: number;
  goalPreviews?: PlanPatchGoalPreview[];
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
  planRow?: SprintGoalPlanRow | null;
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
  updates: { text?: string; checked?: boolean; planRow?: SprintGoalPlanRow | null }
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
