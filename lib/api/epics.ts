import type { Task } from '@/types';

import { getPlannerBeerTrackerApi } from '../plannerBeerTrackerApiOverride';

interface EpicDeepResponse {
  epic: { id: string; key: string; summary: string } | null;
  stories: Array<{
    story: { id: string; key: string; summary: string };
    tasks: Task[];
  }>;
}

export async function fetchEpicDeep(epicKey: string): Promise<EpicDeepResponse> {
  const { data } = await getPlannerBeerTrackerApi().get<EpicDeepResponse>(
    `/epics/${encodeURIComponent(epicKey)}/deep`
  );
  return data;
}

/**
 * Дочерние task/bug эпика: напрямую под эпиком и под стори эпика (Tracker).
 */
export async function fetchEpicTasks(epicKey: string, boardId: number): Promise<Task[]> {
  const { data } = await getPlannerBeerTrackerApi().get<{ tasks: Task[] }>(
    `/epics/${encodeURIComponent(epicKey)}/tasks`,
    { params: { boardId } }
  );
  return data.tasks ?? [];
}

export interface EpicListItem {
  createdAt: string;
  id: string;
  name?: string;
  originalStatus?: string;
  priority?: string;
  status?: string;
  type?: string;
}

interface FetchEpicsResponse {
  epics?: EpicListItem[];
}

/**
 * Получает список эпиков для доски через наш Next.js API.
 * Ходит в `/api/epics` (снимки в PostgreSQL); для клиента это просто список эпиков.
 */
export async function fetchEpicsList(
  boardId: number,
  options?: { perPage?: number; minYear?: number }
): Promise<EpicListItem[]> {
  try {
    const params: Record<string, number | string> = { boardId };
    if (options?.perPage) params.perPage = options.perPage;
    if (options?.minYear) params.minYear = options.minYear;

    const { data } = await getPlannerBeerTrackerApi().get<FetchEpicsResponse>('/epics', {
      params,
    });

    return data.epics ?? [];
  } catch (error) {
    // Логируем и пробрасываем дальше — пусть вызывающий код решает, как отображать ошибку
    // (в UI можно показать сообщение "Не удалось загрузить эпики")

    console.error(`Failed to fetch epics list for board ${boardId}:`, error);
    throw error;
  }
}
