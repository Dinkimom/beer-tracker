/**
 * API событий доступности доски: отпуска, техспринты и прочая занятость участников.
 */

import type {
  BoardAvailabilityEvent,
  BoardAvailabilityEventType,
  TechSprintType,
} from '@/types/quarterly';

import { getPlannerBeerTrackerApi } from '../plannerBeerTrackerApiOverride';

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
