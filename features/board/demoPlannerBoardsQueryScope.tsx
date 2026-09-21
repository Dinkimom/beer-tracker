'use client';

import { createContext, useContext } from 'react';

import { boardsQueryKey } from '@/features/board/boardsQuery';

/** Отдельный ключ React Query, чтобы не подмешивался кэш списка досок основного планера. */
export const demoPlannerBoardsQueryKey = [...boardsQueryKey, 'demo'] as const;

const DemoPlannerBoardsQueryScopeContext = createContext(false);

export function useDemoPlannerBoardsQueryScope(): boolean {
  return useContext(DemoPlannerBoardsQueryScopeContext);
}
