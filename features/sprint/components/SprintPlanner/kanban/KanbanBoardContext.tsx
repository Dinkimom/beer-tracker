'use client';

import type { Task } from '@/types';
import type { BoardColumn } from '@/types/tracker';

import { createContext, useContext } from 'react';

/**
 * Канбан глазами колонки и карточки: что сейчас тащат и куда можно бросить, что делать по правому
 * клику. Задаёт `KanbanView`; дорожки и колонки между ним и карточкой это не передают.
 */
export interface KanbanBoard {
  activeTaskId: string | null;
  /** Колонка, из которой тащат: её не подсвечиваем запретом. */
  sourceColumnId: string | null | undefined;
  canDropInColumn: (column: BoardColumn) => boolean;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
}

export const KanbanBoardContext = createContext<KanbanBoard | null>(null);

export function useKanbanBoard(): KanbanBoard {
  const board = useContext(KanbanBoardContext);
  if (!board) {
    throw new Error('useKanbanBoard must be used inside KanbanBoardContext');
  }
  return board;
}
