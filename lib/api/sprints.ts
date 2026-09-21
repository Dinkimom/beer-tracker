import type { FeatureLanesDocument, OccupancyTaskOrder } from './types';
import type { SprintScoreResponse } from './types';
import type {
  SprintLinksResponse,
  SprintPositionsResponse,
  SprintTasksResponse,
  TaskLink,
  TaskPosition,
} from '@/types';
import type { SprintInfo } from '@/types/tracker';

import { getPlannerBeerTrackerApi } from '../plannerBeerTrackerApiOverride';

type SprintLinkAnchor = 'bottom' | 'left' | 'right' | 'top';

/**
 * Получает позиции задач в спринте
 */
export async function fetchSprintPositions(sprintId: number): Promise<TaskPosition[]> {
  try {
    const { data }: { data: SprintPositionsResponse } = await getPlannerBeerTrackerApi().get(
      `/sprints/${sprintId}/positions`
    );
    return (data.positions || []).map((pos) => ({
      taskId: pos.task_id,
      assignee: pos.assignee_id,
      startDay: pos.start_day,
      startPart: pos.start_part,
      duration: pos.duration,
      plannedStartDay: pos.planned_start_day ?? undefined,
      plannedStartPart: pos.planned_start_part ?? undefined,
      plannedDuration: pos.planned_duration ?? undefined,
      segments: pos.segments?.map((s) => ({
        startDay: s.start_day,
        startPart: s.start_part,
        duration: s.duration,
      })),
    }));
  } catch (error) {
    console.error(`Failed to fetch positions for sprint ${sprintId}:`, error);
    throw error;
  }
}

/**
 * Сохраняет позицию задачи в спринте
 */
export async function saveTaskPosition(
  sprintId: number,
  position: {
    assigneeId: string;
    duration: number;
    devTaskKey?: string;
    isQa?: boolean;
    plannedDuration?: number | null;
    plannedStartDay?: number | null;
    plannedStartPart?: number | null;
    startDay: number;
    startPart: number;
    taskId: string;
    segments?: Array<{ startDay: number; startPart: number; duration: number }>;
  }
): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().post(`/sprints/${sprintId}/positions`, position);
    return true;
  } catch (error) {
    console.error(`Failed to save position for task ${position.taskId}:`, error);
    return false;
  }
}

/**
 * Батч сохранение позиций задач в спринте
 * Позволяет сохранить множество позиций одним запросом
 */
export async function saveTaskPositionsBatch(
  sprintId: number,
  positions: Array<{
    assigneeId: string;
    devTaskKey?: string;
    duration: number;
    isQa?: boolean;
    plannedDuration?: number | null;
    plannedStartDay?: number | null;
    plannedStartPart?: number | null;
    startDay: number;
    startPart: number;
    taskId: string;
    segments?: Array<{ startDay: number; startPart: number; duration: number }>;
  }>
): Promise<{ count: number; success: boolean }> {
  try {
    const { data } = await getPlannerBeerTrackerApi().post(
      `/sprints/${sprintId}/positions/batch`,
      { positions }
    );
    return { success: true, count: data.count || positions.length };
  } catch (error) {
    console.error(`Failed to save batch positions for sprint ${sprintId}:`, error);
    throw error;
  }
}

/**
 * Загружает позиции по всем указанным спринтам одним запросом.
 * Возвращает массив массивов в том же порядке, что и sprintIds.
 */
/**
 * Связи по всем указанным спринтам одним запросом.
 * Порядок массивов совпадает с sprintIds.
 */
export async function fetchSprintLinksBatch(sprintIds: number[]): Promise<TaskLink[][]> {
  if (sprintIds.length === 0) return [];
  try {
    const { data } = await getPlannerBeerTrackerApi().get<{
      bySprint: Array<{
        sprintId: number;
        links: SprintLinksResponse['links'];
      }>;
    }>(`/sprints/batch/links?sprintIds=${sprintIds.join(',')}`);
    return (data.bySprint ?? []).map(({ links }) =>
      (links || []).map((link) => ({
        id: link.id,
        fromTaskId: link.from_task_id,
        toTaskId: link.to_task_id,
        fromAnchor: link.from_anchor as SprintLinkAnchor | undefined,
        toAnchor: link.to_anchor as SprintLinkAnchor | undefined,
      }))
    );
  } catch (error) {
    console.error('Failed to fetch batch links:', error);
    throw error;
  }
}

export async function fetchSprintPositionsBatch(
  sprintIds: number[]
): Promise<TaskPosition[][]> {
  if (sprintIds.length === 0) return [];
  try {
    const { data } = await getPlannerBeerTrackerApi().get<{
      bySprint: Array<{
        sprintId: number;
        positions: SprintPositionsResponse['positions'];
      }>;
    }>(`/sprints/batch/positions?sprintIds=${sprintIds.join(',')}`);
    return (data.bySprint ?? []).map(({ positions }) =>
      (positions || []).map((pos) => ({
        taskId: pos.task_id,
        assignee: pos.assignee_id,
        startDay: pos.start_day,
        startPart: pos.start_part,
        duration: pos.duration,
        plannedStartDay: pos.planned_start_day ?? undefined,
        plannedStartPart: pos.planned_start_part ?? undefined,
        plannedDuration: pos.planned_duration ?? undefined,
        segments: (pos as { segments?: Array<{ start_day: number; start_part: number; duration: number }> }).segments?.map((s) => ({
          startDay: s.start_day,
          startPart: s.start_part,
          duration: s.duration,
        })),
      }))
    );
  } catch (error) {
    console.error('Failed to fetch batch positions:', error);
    throw error;
  }
}

/**
 * Загружает маппинг taskId → storyKey для всех задач в указанных спринтах.
 * Один запрос вместо N по стори/эпикам.
 */
export async function fetchSprintBatchTaskParents(
  sprintIds: number[]
): Promise<Record<string, string>> {
  if (sprintIds.length === 0) return {};
  try {
    const { data } = await getPlannerBeerTrackerApi().get<{ taskIdToStoryKey: Record<string, string> }>(
      `/sprints/batch/task-parents?sprintIds=${sprintIds.join(',')}`
    );
    return data?.taskIdToStoryKey ?? {};
  } catch (error) {
    console.error('Failed to fetch batch task parents:', error);
    throw error;
  }
}

/**
 * Получает связи задач в спринте
 */
export async function fetchSprintLinks(sprintId: number): Promise<TaskLink[]> {
  try {
    const { data }: { data: SprintLinksResponse } = await getPlannerBeerTrackerApi().get(
      `/sprints/${sprintId}/links`,
      { headers: { 'Cache-Control': 'no-cache' } }
    );
    return (data.links || []).map((link) => ({
      id: link.id,
      fromTaskId: link.from_task_id,
      toTaskId: link.to_task_id,
      fromAnchor: link.from_anchor as 'bottom' | 'left' | 'right' | 'top' | undefined,
      toAnchor: link.to_anchor as 'bottom' | 'left' | 'right' | 'top' | undefined,
    }));
  } catch (error) {
    console.error(`Failed to fetch links for sprint ${sprintId}:`, error);
    throw error;
  }
}

/**
 * Сохраняет связь между задачами в спринте
 */
export async function saveTaskLink(
  sprintId: number,
  link: {
    fromAnchor?: string | null;
    fromTaskId: string;
    id: string;
    toAnchor?: string | null;
    toTaskId: string;
  }
): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().post(`/sprints/${sprintId}/links`, link);
    return true;
  } catch (error) {
    console.error(`Failed to save link ${link.id}:`, error);
    return false;
  }
}

/**
 * Батч сохранение связей между задачами в спринте
 * Позволяет сохранить множество связей одним запросом
 */
export async function saveTaskLinksBatch(
  sprintId: number,
  links: Array<{
    fromAnchor?: string | null;
    fromTaskId: string;
    id: string;
    toAnchor?: string | null;
    toTaskId: string;
  }>
): Promise<{ count: number; success: boolean }> {
  try {
    const { data } = await getPlannerBeerTrackerApi().post(
      `/sprints/${sprintId}/links/batch`,
      { links }
    );
    return { success: true, count: data.count || links.length };
  } catch (error) {
    console.error(`Failed to save batch links for sprint ${sprintId}:`, error);
    throw error;
  }
}

/**
 * Удаляет связь между задачами в спринте
 */
export async function deleteTaskLink(sprintId: number, linkId: string): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().delete(`/sprints/${sprintId}/links?linkId=${linkId}`);
    return true;
  } catch (error) {
    console.error(`Failed to delete link ${linkId}:`, error);
    return false;
  }
}

/**
 * Обновляет статус спринта
 */
export async function updateSprintStatus(
  sprintId: number,
  status: 'archived' | 'draft' | 'in_progress' | 'released',
  version?: number
): Promise<{ error?: string; sprint?: SprintInfo; success: boolean }> {
  try {
    const { data: result } = await getPlannerBeerTrackerApi().patch(
      `/sprints/${sprintId}/status`,
      { status, version }
    );
    return { success: true, sprint: result.sprint };
  } catch (error) {
    console.error(`Failed to update sprint ${sprintId} status:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Получает задачи спринта.
 * @param statusFilter — для вкладки «Занятость»: all | active | completed (опционально)
 */
export async function fetchSprintTasks(
  sprintId: number,
  boardId?: number,
  statusFilter?: 'active' | 'all' | 'completed',
  options?: { refresh?: boolean }
): Promise<SprintTasksResponse> {
  try {
    const params = new URLSearchParams({ sprintId: String(sprintId) });
    if (boardId != null) params.set('boardId', String(boardId));
    if (statusFilter && statusFilter !== 'all') params.set('statusFilter', statusFilter);
    if (options?.refresh) params.set('refresh', '1');
    const { data } = await getPlannerBeerTrackerApi().get(`/tracker?${params.toString()}`);
    return data;
  } catch (error) {
    console.error(`Failed to fetch tasks for sprint ${sprintId}:`, error);
    throw error;
  }
}

/**
 * Удаляет позицию задачи в спринте
 */
export async function deleteTaskPosition(sprintId: number, taskId: string): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().delete(`/sprints/${sprintId}/positions?taskId=${taskId}`);
    return true;
  } catch (error) {
    console.error(`Failed to delete position for task ${taskId} in sprint ${sprintId}:`, error);
    return false;
  }
}

/**
 * Очищает все позиции в спринте
 */
export async function clearSprintPositions(sprintId: number): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().delete(`/sprints/${sprintId}/positions/clear`);
    return true;
  } catch (error) {
    console.error(`Failed to clear positions in sprint ${sprintId}:`, error);
    return false;
  }
}

/**
 * Очищает все связи в спринте
 */
export async function clearSprintLinks(sprintId: number): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().delete(`/sprints/${sprintId}/links/clear`);
    return true;
  } catch (error) {
    console.error(`Failed to clear links in sprint ${sprintId}:`, error);
    return false;
  }
}

/**
 * Получает порядок стори и задач для вкладки «Занятость»
 */
export async function fetchOccupancyTaskOrder(
  sprintId: number
): Promise<OccupancyTaskOrder | null> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get<{ order: OccupancyTaskOrder | null }>(
      `/sprints/${sprintId}/occupancy-task-order`
    );
    return data?.order ?? null;
  } catch (error) {
    console.error(`Failed to fetch occupancy task order for sprint ${sprintId}:`, error);
    throw error;
  }
}

/**
 * Получает оценку спринта по командам (цели, SP, QA, итоговая оценка)
 */
export async function fetchSprintScore(sprintId: number): Promise<SprintScoreResponse> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get<SprintScoreResponse>(
      `/sprints/${sprintId}/score`
    );
    return {
      rows: data?.rows ?? [],
      testingFlowMode: data?.testingFlowMode ?? 'unknown',
    };
  } catch (error) {
    console.error(`Failed to fetch sprint score for sprint ${sprintId}:`, error);
    return { rows: [], testingFlowMode: 'unknown' };
  }
}

/**
 * Сохраняет порядок стори и задач для вкладки «Занятость»
 */
export async function saveOccupancyTaskOrder(
  sprintId: number,
  order: OccupancyTaskOrder
): Promise<void> {
  try {
    await getPlannerBeerTrackerApi().put(`/sprints/${sprintId}/occupancy-task-order`, order);
  } catch (error) {
    console.error(`Failed to save occupancy task order for sprint ${sprintId}:`, error);
    throw error;
  }
}

export async function fetchFeatureLanes(sprintId: number): Promise<FeatureLanesDocument | null> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get<{ lanes: FeatureLanesDocument | null }>(
      `/sprints/${sprintId}/feature-lanes`
    );
    return data?.lanes ?? null;
  } catch (error) {
    console.error(`Failed to fetch feature lanes for sprint ${sprintId}:`, error);
    throw error;
  }
}

export async function saveFeatureLanes(
  sprintId: number,
  lanes: FeatureLanesDocument
): Promise<void> {
  try {
    await getPlannerBeerTrackerApi().put(`/sprints/${sprintId}/feature-lanes`, lanes);
  } catch (error) {
    console.error(`Failed to save feature lanes for sprint ${sprintId}:`, error);
    throw error;
  }
}

export { fetchBacklog, fetchBurndownData } from './sprintsApiBurndownBacklog';
export { approveAllPendingSprintComments, approveSprintComment, createSprintDiagramComment, createSprintImageComment, deleteComment, fetchSprintCommentDiagram, fetchSprintComments, moveSprintComments, rejectAllPendingSprintComments, saveComment, saveSprintCommentDiagram, toggleCommentReaction } from './sprintsApiComments';
