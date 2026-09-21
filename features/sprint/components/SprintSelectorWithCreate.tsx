'use client';

import type { SprintListItem } from '@/types/tracker';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { CreateSprintModal } from '@/features/backlog/components/CreateSprintModal';
import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { sprintsQueryKey } from '@/features/sprint/hooks/useSprints';
import { createSprint } from '@/lib/beerTrackerApi';

import { SprintSelector } from './SprintSelector';

interface SprintSelectorWithCreateProps {
  boardId: number | null | undefined;
  className?: string;
  loading?: boolean;
  selectedSprintId: number | null;
  sprints: SprintListItem[];
  sprintsLoading?: boolean;
  onSprintChange: (sprintId: number | null) => void;
}

/**
 * SprintSelector + CreateSprintModal: создание из шапки списка, с инвалидацией
 * кэша и авто-выбором нового спринта.
 */
export function SprintSelectorWithCreate({
  boardId,
  className,
  loading = false,
  selectedSprintId,
  sprints,
  sprintsLoading = false,
  onSprintChange,
}: SprintSelectorWithCreateProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const isDemoPlannerBoards = useDemoPlannerBoardsQueryScope();
  const [isCreateSprintModalOpen, setIsCreateSprintModalOpen] = useState(false);

  const handleSubmitSprint = async (data: {
    name: string;
    startDate: string;
    endDate: string;
  }) => {
    if (!boardId) {
      toast.error(t('backlog.toast.boardNotSelected'));
      return;
    }

    const result = await createSprint({
      name: data.name,
      boardId,
      startDate: data.startDate,
      endDate: data.endDate,
    });

    if (result.success) {
      toast.success(t('backlog.toast.sprintCreated'));
      await queryClient.invalidateQueries({
        queryKey: sprintsQueryKey(boardId, isDemoPlannerBoards),
      });
      if (typeof result.sprint?.id === 'number') {
        onSprintChange(result.sprint.id);
      }
    } else {
      toast.error(result.error || t('backlog.toast.sprintCreateFailed'));
      throw new Error(result.error);
    }
  };

  return (
    <>
      <SprintSelector
        className={className}
        loading={loading}
        selectedSprintId={selectedSprintId}
        sprints={sprints}
        sprintsLoading={sprintsLoading}
        onCreateSprint={boardId ? () => setIsCreateSprintModalOpen(true) : undefined}
        onSprintChange={onSprintChange}
      />
      {boardId ? (
        <CreateSprintModal
          isOpen={isCreateSprintModalOpen}
          sprints={sprints}
          onClose={() => setIsCreateSprintModalOpen(false)}
          onSubmit={handleSubmitSprint}
        />
      ) : null}
    </>
  );
}
