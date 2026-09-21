'use client';

import type { AvailabilityUpsertModalState } from '@/features/swimlane/hooks/useSwimlaneAvailabilityUi';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { useQueryClient } from '@tanstack/react-query';

import { useConfirmDialog } from '@/components/ConfirmDialog';
import { AvailabilityEventUpsertModal } from '@/features/swimlane/components/AvailabilityEventUpsertModal';
import {
  confirmAndDeleteBoardAvailabilityEvent,
  submitBoardAvailabilityEvent,
} from '@/features/swimlane/components/boardAvailabilityModalHelpers';

interface SwimlaneAvailabilityModalGateProps {
  upsertModal: AvailabilityUpsertModalState | null;
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

export function SwimlaneAvailabilityModalGate({
  upsertModal,
  onClose,
}: SwimlaneAvailabilityModalGateProps) {
  const queryClient = useQueryClient();
  const { confirmWithAction, DialogComponent } = useConfirmDialog();

  if (!upsertModal) {
    return DialogComponent;
  }

  const patchCache = (patch: (prev: BoardAvailabilityEvent[]) => BoardAvailabilityEvent[]) =>
    patchBoardAvailabilityCache(queryClient, upsertModal.boardId, patch);
  const editing = upsertModal.editing;

  return (
    <>
      <AvailabilityEventUpsertModal
        initial={{
          endDate: upsertModal.endDate,
          eventType: editing?.eventType ?? 'vacation',
          startDate: upsertModal.startDate,
          techSprintSubtype: editing?.techSprintSubtype,
        }}
        isOpen={true}
        title={editing ? 'Редактировать событие' : 'Добавить событие'}
        onClose={onClose}
        onDelete={
          editing
            ? async () => {
                const deleted = await confirmAndDeleteBoardAvailabilityEvent({
                  boardId: upsertModal.boardId,
                  confirmMessage: 'Удалить это событие?',
                  confirmWithAction,
                  eventId: editing.id,
                  memberId: upsertModal.memberId,
                  patchBoardEventsCache: patchCache,
                });
                if (deleted) {
                  onClose();
                }
              }
            : undefined
        }
        onSubmit={async ({ startDate, endDate, eventType, techSprintSubtype }) => {
          await submitBoardAvailabilityEvent({
            boardId: upsertModal.boardId,
            editing,
            endDate,
            eventType,
            memberId: upsertModal.memberId,
            memberName: upsertModal.memberName,
            patchBoardEventsCache: patchCache,
            sprintId: upsertModal.sprintId,
            startDate,
            techSprintSubtype,
          });
        }}
      />
      {DialogComponent}
    </>
  );
}
