'use client';

import type { Developer } from '@/types';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { useCallback, useState } from 'react';

import { resolvePlacementToolAfterAvailabilityPopoverClose } from '@/features/sprint/components/SprintPlanner/utils/swimlanePlacementToolbar';
import { useRootStore } from '@/lib/layers';

export interface AvailabilityPopoverState {
  boardId: number;
  editing: BoardAvailabilityEvent | null;
  endDate: string;
  memberId: string;
  memberName: string;
  sprintId?: number;
  startDate: string;
}

interface UseSwimlaneAvailabilityUiParams {
  boardEvents?: BoardAvailabilityEvent[];
  boardId: number | null;
  developer: Developer;
  sprintId?: number | null;
}

export function useSwimlaneAvailabilityUi({
  boardEvents,
  boardId,
  developer,
  sprintId,
}: UseSwimlaneAvailabilityUiParams) {
  const { sprintPlannerUi } = useRootStore();
  const [ui, setUi] = useState<AvailabilityPopoverState | null>(null);

  const close = useCallback(() => {
    setUi(null);
    const next = resolvePlacementToolAfterAvailabilityPopoverClose(sprintPlannerUi.placementTool);
    if (next !== sprintPlannerUi.placementTool) {
      sprintPlannerUi.setPlacementTool(next);
    }
  }, [sprintPlannerUi]);

  const openUpsertForEventId = useCallback(
    (eventId: string) => {
      const event = boardEvents?.find((item) => item.id === eventId);
      if (!boardId || !event) {
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
    [boardEvents, boardId, developer.id, developer.name, sprintId]
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

  return { close, openCreateForDate, openUpsertForEventId, ui };
}
