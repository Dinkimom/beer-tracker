import type { TeamMemberAddRequestBody } from '@/lib/staffTeams/buildTrackerTeamMemberAddBody';
import type { Developer } from '@/types';
import type { AxiosError } from 'axios';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

function readApiErrorMessage(error: unknown, fallback: string): string {
  const ax = error as AxiosError<{ error?: string }>;
  const fromApi = ax.response?.data?.error;
  return typeof fromApi === 'string' && fromApi.trim() ? fromApi : fallback;
}

export async function fetchTeamMembersForBoard(boardId: number): Promise<Developer[]> {
  const { data } = await getPlannerBeerTrackerApi().get<{ developers?: Developer[] }>(
    `/teams/members?boardId=${encodeURIComponent(String(boardId))}`
  );
  return Array.isArray(data.developers) ? data.developers : [];
}

export async function addTeamMemberForBoard(
  boardId: number,
  body: TeamMemberAddRequestBody
): Promise<void> {
  try {
    await getPlannerBeerTrackerApi().post(`/teams/members?boardId=${encodeURIComponent(String(boardId))}`, body);
  } catch (error) {
    throw new Error(readApiErrorMessage(error, 'Не удалось добавить участника'));
  }
}

export async function searchBoardTeamRegistry(
  boardId: number,
  query: string,
  signal?: AbortSignal
): Promise<
  Array<{
    avatarUrl?: string | null;
    displayName: string;
    email?: string | null;
    staffUid: string;
    trackerId: string;
  }>
> {
  const { data } = await getPlannerBeerTrackerApi().get<{
    items?: Array<{
      avatarUrl?: string | null;
      displayName: string;
      email?: string | null;
      staffUid: string;
      trackerId: string;
    }>;
  }>('/teams/members/registry-search', {
    params: { boardId, q: query },
    signal,
  });
  return Array.isArray(data.items) ? data.items : [];
}

export async function removeTeamMemberForBoard(
  boardId: number,
  assigneeId: string
): Promise<void> {
  try {
    await getPlannerBeerTrackerApi().delete(
      `/teams/members?boardId=${encodeURIComponent(String(boardId))}&assigneeId=${encodeURIComponent(assigneeId)}`
    );
  } catch (error) {
    throw new Error(readApiErrorMessage(error, 'Не удалось удалить участника'));
  }
}
