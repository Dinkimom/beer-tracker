'use client';

import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import {
  createBoardAvailabilityEvent,
  deleteBoardAvailabilityEvent,
  updateBoardAvailabilityEvent,
} from '@/lib/beerTrackerApi';

type AbsenceChanges = Partial<Pick<BoardAvailabilityEvent, 'endDate' | 'eventType' | 'startDate'>>;

/**
 * Правки отсутствий со строки квартала (QV4): перенос, вид и удаление видны сразу, а при ошибке сервера
 * откатываются. Кэш тот же, что у доски спринта (QV1), поэтому правка сразу видна и там.
 */
export function useQuarterAbsenceEdits(boardId: number) {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const patch = (change: (events: BoardAvailabilityEvent[]) => BoardAvailabilityEvent[]) =>
    queryClient.setQueryData<BoardAvailabilityEvent[]>(['boardAvailabilityEvents', boardId], (prev) =>
      change(Array.isArray(prev) ? prev : [])
    );
  const replace = (event: BoardAvailabilityEvent) =>
    patch((events) => events.map((item) => (item.id === event.id ? event : item)));
  const fail = (messageKey: string) => (error: unknown) => {
    console.error(error);
    toast.error(t(messageKey));
  };

  return {
    /** Новое отсутствие; null — сервер не принял. */
    create: async (
      input: Pick<BoardAvailabilityEvent, 'endDate' | 'eventType' | 'memberId' | 'memberName' | 'startDate'>
    ) => {
      try {
        const created = await createBoardAvailabilityEvent({ ...input, boardId });
        patch((events) => [...events, created]);
        return created;
      } catch (error) {
        fail('sprintPlanner.swimlane.availability.createFailed')(error);
        return null;
      }
    },
    remove: (event: BoardAvailabilityEvent) => {
      patch((events) => events.filter((item) => item.id !== event.id));
      deleteBoardAvailabilityEvent({ boardId, id: event.id, memberId: event.memberId }).catch((error: unknown) => {
        patch((events) => [...events, event]);
        fail('sprintPlanner.swimlane.availability.deleteFailed')(error);
      });
    },
    update: (event: BoardAvailabilityEvent, changes: AbsenceChanges) => {
      const updated = { ...event, ...changes };
      replace(updated);
      updateBoardAvailabilityEvent({ ...updated, boardId }).catch((error: unknown) => {
        replace(event);
        fail('sprintPlanner.swimlane.availability.updateFailed')(error);
      });
    },
  };
}
