'use client';

import type { SprintBoard } from './SprintBoard';

import { createContext, useContext } from 'react';

export const SprintBoardContext = createContext<SprintBoard | null>(null);

/** Модель доски текущего спринта. Компонент, который её читает, — `observer`. */
export function useSprintBoard(): SprintBoard {
  const board = useContext(SprintBoardContext);
  if (!board) {
    throw new Error('useSprintBoard must be used inside SprintBoardContext');
  }
  return board;
}
