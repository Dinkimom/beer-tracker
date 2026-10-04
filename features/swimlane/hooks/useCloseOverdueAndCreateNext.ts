'use client';

import type { Task, TaskPosition } from '@/types';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { getPartsPerDay } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { closeOverdueAndCreateNextRun } from '@/features/swimlane/utils/closeOverdueAndCreateNextRun';

interface UseCloseOverdueAndCreateNextInput {
  boardId: number | null;
  selectedSprintId: number | null;
  getQueueByBoardId: (boardId: number | null) => string | null;
  onStatusChange: (
    taskId: string,
    transitionId: string,
    targetStatusKey?: string,
    targetStatusDisplay?: string,
    screenId?: string
  ) => Promise<void>;
  savePosition: (position: TaskPosition, isQa: boolean) => Promise<void>;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}

export function useCloseOverdueAndCreateNext(input: UseCloseOverdueAndCreateNextInput) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const inFlightRef = useRef(false);
  const {
    boardId,
    getQueueByBoardId,
    onStatusChange,
    savePosition,
    selectedSprintId,
    setTasks,
  } = input;

  return useCallback(
    async (args: {
      currentCell: number;
      position: TaskPosition;
      task: Task;
      timelineTotalParts: number;
    }) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        await closeOverdueAndCreateNextRun({
          ...args,
          boardId,
          getQueueByBoardId,
          onStatusChange,
          partsPerDay: getPartsPerDay(),
          queryClient,
          savePosition,
          selectedSprintId,
          setTasks,
          t,
        });
      } finally {
        inFlightRef.current = false;
      }
    },
    [boardId, getQueueByBoardId, onStatusChange, queryClient, savePosition, selectedSprintId, setTasks, t]
  );
}
