import type { BoardListItem } from '@/lib/api/types';
import type { TransportResult } from '@/lib/layers/transport/types';

import { fetchBoardsTransport } from '@/lib/layers/transport/boardsTransport';

/**
 * Каталог досок для планера: transport → доменные типы (при необходимости — маппинг здесь).
 */
export function loadBoardsForPlanner(): Promise<TransportResult<BoardListItem[]>> {
  return fetchBoardsTransport();
}
