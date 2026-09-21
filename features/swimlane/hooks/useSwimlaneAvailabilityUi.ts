'use client';

import type { Developer } from '@/types';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { useCallback, useState } from 'react';

export interface AvailabilityUpsertModalState {
  boardId: number;
  editing: BoardAvailabilityEvent | null;
  endDate: string;
  memberId: string;
  memberName: string;
  sprintId?: number;
  startDate: string;
}

interface UseSwimlaneAvailabilityUiParams {
  boardId: number | null;
  developer: Developer;
  sprintId?: number | null;
}

export function useSwimlaneAvailabilityUi({
  boardId,
  developer,
  sprintId,
}: UseSwimlaneAvailabilityUiParams) {
  const [ui, setUi] = useState<AvailabilityUpsertModalState | null>(null);

  const close = useCallback(() => setUi(null), []);

  const openUpsertForEvent = useCallback(
    (event: BoardAvailabilityEvent) => {
      if (!boardId) {
        return;
      }
      setUi({
        boardId,
        editing: event,
        endDate: event.endDate,
        memberId: developer.id,
        memberName: developer.name,
        sprintId: sprintId ?? undefined,
        startDate: event.startDate,
      });
    },
    [boardId, developer.id, developer.name, sprintId]
  );

  const openCreateForDate = useCallback(
    (startDate: string) => {
      if (!boardId || !startDate) {
        return;
      }
      setUi({
        boardId,
        editing: null,
        endDate: startDate,
        memberId: developer.id,
        memberName: developer.name,
        sprintId: sprintId ?? undefined,
        startDate,
      });
    },
    [boardId, developer.id, developer.name, sprintId]
  );

  return { close, openCreateForDate, openUpsertForEvent, ui };
}
