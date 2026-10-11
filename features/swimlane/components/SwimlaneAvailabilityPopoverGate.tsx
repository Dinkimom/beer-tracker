'use client';

import type { AvailabilityPopoverState } from '@/features/swimlane/hooks/useSwimlaneAvailabilityUi';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { useQueryClient } from '@tanstack/react-query';

import { AvailabilityEventPopover } from '@/features/swimlane/components/AvailabilityEventPopover';
import {
  deleteBoardAvailabilityEventAndPatchCache,
  submitBoardAvailabilityEvent,
} from '@/features/swimlane/components/boardAvailabilityModalHelpers';

interface SwimlaneAvailabilityPopoverGateProps {
  popover: AvailabilityPopoverState | null;
  sprintStartDate: Date;
  sprintTimelineWorkingDays: number;
  onClose: () => void;
}

function patchBoardAvailabilityCache(
  queryClient: ReturnType<typeof useQueryClient>,
  boardId: number,
  patch: (prev: BoardAvailabilityEvent[]) => BoardAvailabilityEvent[]
) {
  queryClient.setQueryData<BoardAvailabilityEvent[]>(['boardAvailabilityEvents', boardId], (prev) =>
    patch(Array.isArray(prev) ? prev : [])
  );
}

export function SwimlaneAvailabilityPopoverGate({
  popover,
  sprintStartDate,
  sprintTimelineWorkingDays,
  onClose,
}: SwimlaneAvailabilityPopoverGateProps) {
  const queryClient = useQueryClient();

  if (!popover) {
    return null;
  }

  const patchCache = (patch: (prev: BoardAvailabilityEvent[]) => BoardAvailabilityEvent[]) =>
    patchBoardAvailabilityCache(queryClient, popover.boardId, patch);
  const editing = popover.editing;

  return (
    <AvailabilityEventPopover
      key={editing?.id ?? `new:${popover.startDate}`}
      initial={{
        endDate: popover.endDate,
        eventType: editing?.eventType ?? 'vacation',
        startDate: popover.startDate,
        techSprintSubtype: editing?.techSprintSubtype,
      }}
      isEditing={editing != null}
      sprintStartDate={sprintStartDate}
      sprintTimelineWorkingDays={sprintTimelineWorkingDays}
      onClose={onClose}
      onDelete={
        editing
          ? () =>
              deleteBoardAvailabilityEventAndPatchCache({
                boardId: popover.boardId,
                eventId: editing.id,
                memberId: popover.memberId,
                patchBoardEventsCache: patchCache,
              })
          : undefined
      }
      onSubmit={async ({ startDate, endDate, eventType, techSprintSubtype }) => {
        await submitBoardAvailabilityEvent({
          boardId: popover.boardId,
          editing,
          endDate,
          eventType,
          memberId: popover.memberId,
          memberName: popover.memberName,
          patchBoardEventsCache: patchCache,
          sprintId: popover.sprintId,
          startDate,
          techSprintSubtype,
        });
      }}
    />
  );
}
