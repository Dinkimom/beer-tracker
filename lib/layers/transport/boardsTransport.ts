import type { TransportResult } from './types';
import type { BoardListItem } from '@/lib/api/types';

import { getPlannerBeerTrackerApi } from '../../plannerBeerTrackerApiOverride';

/**
 * GET /api/boards — без доменной логики, только HTTP + разбор ответа.
 */
export async function fetchBoardsTransport(): Promise<TransportResult<BoardListItem[]>> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get<BoardListItem[]>('/boards');
    return { data: Array.isArray(data) ? data : [], ok: true };
  } catch (error) {
    return { error, ok: false };
  }
}
