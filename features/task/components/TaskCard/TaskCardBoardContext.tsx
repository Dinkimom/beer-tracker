'use client';

import type { TaskCardBoard } from '@/lib/taskCard/taskCardSlots';

import { createContext, useContext, type ReactNode } from 'react';

/** Доска, чья раскладка слотов рисует карточку. Канбан задаёт её над своими колонками. */
const TaskCardBoardContext = createContext<TaskCardBoard>('swimlane');

export function TaskCardBoardProvider({ board, children }: { board: TaskCardBoard; children: ReactNode }) {
  return <TaskCardBoardContext.Provider value={board}>{children}</TaskCardBoardContext.Provider>;
}

export function useTaskCardBoard(): TaskCardBoard {
  return useContext(TaskCardBoardContext);
}
