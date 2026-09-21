import type { BoardAvailabilityEvent, BoardAvailabilityEventType, TechSprintType } from '@/types/quarterly';

import toast from 'react-hot-toast';

import { createBoardAvailabilityEvent, deleteBoardAvailabilityEvent, updateBoardAvailabilityEvent } from '@/lib/beerTrackerApi';

function sortEventsByStartDate(events: BoardAvailabilityEvent[]): BoardAvailabilityEvent[] {
  return [...events].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function replaceAvailabilityEvent(
  events: BoardAvailabilityEvent[],
  updated: BoardAvailabilityEvent
): BoardAvailabilityEvent[] {
  return sortEventsByStartDate(events.map((event) => (event.id === updated.id ? updated : event)));
}

function appendAvailabilityEvent(
  events: BoardAvailabilityEvent[],
  created: BoardAvailabilityEvent
): BoardAvailabilityEvent[] {
  return sortEventsByStartDate([...events, created]);
}

function applyAvailabilityEventUpsert(
  event: BoardAvailabilityEvent,
  isEdit: boolean,
  setItems: ((updater: (prev: BoardAvailabilityEvent[]) => BoardAvailabilityEvent[]) => void) | undefined,
  patchBoardEventsCache: (patch: (prev: BoardAvailabilityEvent[]) => BoardAvailabilityEvent[]) => void
): void {
  const patch = isEdit ? replaceAvailabilityEvent : appendAvailabilityEvent;
  setItems?.((prev) => patch(prev, event));
  patchBoardEventsCache((prev) => patch(prev, event));
}

export async function submitBoardAvailabilityEvent(args: {
  boardId: number;
  editing: BoardAvailabilityEvent | null;
  endDate: string;
  eventType: BoardAvailabilityEventType;
  memberId: string;
  memberName: string;
  patchBoardEventsCache: (patch: (prev: BoardAvailabilityEvent[]) => BoardAvailabilityEvent[]) => void;
  setItems?: (updater: (prev: BoardAvailabilityEvent[]) => BoardAvailabilityEvent[]) => void;
  sprintId?: number;
  startDate: string;
  techSprintSubtype?: TechSprintType;
}): Promise<void> {
  const techSprintFields =
    args.eventType === 'tech_sprint' ? { techSprintSubtype: args.techSprintSubtype } : {};

  try {
    if (args.editing) {
      const updated = await updateBoardAvailabilityEvent({
        boardId: args.boardId,
        endDate: args.endDate,
        eventType: args.eventType,
        id: args.editing.id,
        memberId: args.memberId,
        memberName: args.memberName,
        sprintId: args.sprintId,
        startDate: args.startDate,
        ...techSprintFields,
      });
      applyAvailabilityEventUpsert(updated, true, args.setItems, args.patchBoardEventsCache);
      toast.success('Событие обновлено');
      return;
    }

    const created = await createBoardAvailabilityEvent({
      boardId: args.boardId,
      endDate: args.endDate,
      eventType: args.eventType,
      memberId: args.memberId,
      memberName: args.memberName,
      sprintId: args.sprintId,
      startDate: args.startDate,
      ...techSprintFields,
    });
    applyAvailabilityEventUpsert(created, false, args.setItems, args.patchBoardEventsCache);
    toast.success('Событие добавлено');
  } catch (error) {
    console.error(error);
    toast.error(args.editing ? 'Не удалось обновить событие' : 'Не удалось добавить событие');
    throw error;
  }
}

function removeAvailabilityEventById(
  events: BoardAvailabilityEvent[],
  eventId: string
): BoardAvailabilityEvent[] {
  return events.filter((event) => event.id !== eventId);
}

async function deleteBoardAvailabilityEventAndPatchCache(args: {
  boardId: number;
  eventId: string;
  memberId: string;
  patchBoardEventsCache: (patch: (prev: BoardAvailabilityEvent[]) => BoardAvailabilityEvent[]) => void;
}): Promise<void> {
  try {
    await deleteBoardAvailabilityEvent({
      boardId: args.boardId,
      id: args.eventId,
      memberId: args.memberId,
    });
  } catch (error) {
    console.error(error);
    toast.error('Не удалось удалить событие');
    throw error;
  }
  args.patchBoardEventsCache((prev) => removeAvailabilityEventById(prev, args.eventId));
  toast.success('Событие удалено');
}

export function confirmAndDeleteBoardAvailabilityEvent(args: {
  boardId: number;
  confirmWithAction: (
    message: string,
    onConfirmAction: () => Promise<void> | void,
    options: { confirmText: string; title: string; variant: 'destructive' }
  ) => Promise<boolean>;
  confirmMessage: string;
  eventId: string;
  memberId: string;
  patchBoardEventsCache: (patch: (prev: BoardAvailabilityEvent[]) => BoardAvailabilityEvent[]) => void;
}): Promise<boolean> {
  return args.confirmWithAction(
    args.confirmMessage,
    () => deleteBoardAvailabilityEventAndPatchCache(args),
    {
      confirmText: 'Удалить',
      title: 'Удаление события',
      variant: 'destructive',
    }
  );
}
