/**
 * Tracker API: доски и колонки (только сервер).
 */

import type { BoardColumn, BoardParams } from '@/types/tracker';
import type { TrackerBoardColumnResponse } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import { requireTrackerAxiosForApiRoute } from '../trackerAxiosFactory';

import { TRACKER_V3_BASE } from './constants';

interface TrackerBoardListItem {
  id: number;
  name: string;
  self: string;
}

export async function fetchTrackerBoardsPaginate(
  axiosInstance?: AxiosInstance
): Promise<TrackerBoardListItem[]> {
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const { data } = await api.get<TrackerBoardListItem[]>(
    `${TRACKER_V3_BASE}/boards/_paginate?perPage=500`
  );
  return Array.isArray(data) ? data : [];
}

async function fetchBoardColumns(
  boardId: number,
  axiosInstance?: AxiosInstance
): Promise<TrackerBoardColumnResponse[]> {
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const { data } = await api.get<TrackerBoardColumnResponse[]>(
    `${TRACKER_V3_BASE}/boards/${boardId}/columns`
  );
  return data;
}

export async function fetchBoardParams(
  boardId: number,
  axiosInstance?: AxiosInstance
): Promise<BoardParams> {
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const [boardData, columnsData] = await Promise.all([
    api.get<Omit<BoardParams, 'columns'>>(`${TRACKER_V3_BASE}/boards/${boardId}`),
    fetchBoardColumns(boardId, axiosInstance),
  ]);
  const columns: BoardColumn[] = columnsData.map((col) => ({
    display: col.name,
    id: String(col.id),
    self: col.self,
    statusKeys: col.statuses.map((s) => s.key),
  }));
  return {
    ...boardData.data,
    columns,
  };
}
