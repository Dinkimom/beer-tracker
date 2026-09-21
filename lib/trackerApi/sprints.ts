/**
 * Tracker API: спринты (только сервер).
 */

import type { SprintInfo } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import { apiCache, cacheKeys } from '@/lib/cache';

import { requireTrackerAxiosForApiRoute } from '../trackerAxiosFactory';

import { patchSprintStatusHandlingPrecondition } from './sprintStatusPatchHelpers';

const SPRINT_INFO_CACHE_TTL_SEC = 10 * 60;

function parseBoardIdFromTracker(raw: number | string | null | undefined): number | undefined {
  if (raw == null) return undefined;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : undefined;
}

export async function fetchSprintInfo(
  sprintId: number,
  axiosInstance?: AxiosInstance
): Promise<SprintInfo> {
  const cached = apiCache.get<SprintInfo>(cacheKeys.sprintInfo(sprintId));
  if (cached) return cached;

  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const { data } = await api.get<SprintInfo>(`/sprints/${sprintId}`);

  const info: SprintInfo = {
    id: data.id,
    name: data.name,
    status: data.status,
    startDate: data.startDate,
    endDate: data.endDate,
    startDateTime: data.startDateTime,
    endDateTime: data.endDateTime,
    version: data.version,
  };
  apiCache.set(cacheKeys.sprintInfo(sprintId), info, SPRINT_INFO_CACHE_TTL_SEC);
  return info;
}

/** Ответ PATCH/GET спринта в Tracker может содержать board — нужен для сброса кэша списка спринтов доски */
type SprintPayloadWithBoard = SprintInfo & { board?: { id?: number | string } };

function sprintInfoFromPayload(data: SprintPayloadWithBoard): SprintInfo & { boardId?: number } {
  const boardId = parseBoardIdFromTracker(data.board?.id);
  const base: SprintInfo & { boardId?: number } = {
    id: data.id,
    name: data.name,
    status: data.status,
    startDate: data.startDate,
    endDate: data.endDate,
    startDateTime: data.startDateTime,
    endDateTime: data.endDateTime,
    version: data.version,
  };
  if (boardId != null) {
    base.boardId = boardId;
  }
  return base;
}

async function fetchSprintPayload(
  api: AxiosInstance,
  sprintId: number
): Promise<SprintPayloadWithBoard> {
  const { data } = await api.get<SprintPayloadWithBoard>(`/sprints/${sprintId}`);
  return data;
}

/** Доска спринта в Tracker — для deep link в планер из уведомлений и кэша. */
export async function resolveTrackerSprintBoardId(
  sprintId: number,
  axiosInstance?: AxiosInstance
): Promise<number | undefined> {
  try {
    const api = requireTrackerAxiosForApiRoute(axiosInstance);
    const full = await fetchSprintPayload(api, sprintId);
    return parseBoardIdFromTracker(full.board?.id);
  } catch {
    return undefined;
  }
}

export async function updateTrackerSprintStatus(
  sprintId: number,
  status: 'archived' | 'draft' | 'in_progress' | 'released',
  version?: number,
  axiosInstance?: AxiosInstance
): Promise<(SprintInfo & { boardId?: number }) | null> {
  try {
    const api = requireTrackerAxiosForApiRoute(axiosInstance);
    const data = await patchSprintStatusHandlingPrecondition(api, sprintId, status, version);
    const sprint = sprintInfoFromPayload(data);
    if (sprint.boardId == null) {
      const boardId = await resolveTrackerSprintBoardId(sprintId, api);
      if (boardId != null) {
        sprint.boardId = boardId;
      }
    }
    return sprint;
  } catch (error) {
    console.error(`Failed to update sprint ${sprintId} status:`, error);
    return null;
  }
}
