'use client';

import type { SprintListItem } from '@/types/tracker';

import { DndContext, DragOverlay } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { useBacklogManagement } from '@/features/sidebar/hooks/useBacklogManagement';
import { TaskCard } from '@/features/task/components/TaskCard/TaskCard';
import { useSelectedBoardStorage } from '@/hooks/useLocalStorage';
import { createSprint } from '@/lib/beerTrackerApi';

import { useActiveTask } from '../hooks/useActiveTask';
import { useBacklogDragAndDrop } from '../hooks/useBacklogDragAndDrop';
import { useForwardHorizontalWheelScroll } from '../hooks/useForwardHorizontalWheelScroll';
import { organizeSprints } from '../utils/sprintUtils';

import { ArchivedSprintsList } from './ArchivedSprintsList';
import { BacklogColumn } from './BacklogColumn';
import { CreateSprintModal } from './CreateSprintModal';
import { SprintColumn } from './SprintColumn';

interface BacklogPageProps {
  /** Для демо-планера: доска из страницы, без чтения localStorage выбранной доски. */
  lockedBoardId?: number;
  sprints: SprintListItem[];
  sprintsLoading: boolean;
}

export function BacklogPage({ lockedBoardId, sprints, sprintsLoading }: BacklogPageProps) {
  const { t } = useI18n();
  const [storedBoardId] = useSelectedBoardStorage();
  const selectedBoardId = lockedBoardId ?? storedBoardId;
  const isDemoPlannerBoards = useDemoPlannerBoardsQueryScope();
  const queryClient = useQueryClient();
  const [isCreateSprintModalOpen, setIsCreateSprintModalOpen] = useState(false);
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  useForwardHorizontalWheelScroll(horizontalScrollRef);

  const {
    addTask,
    backlogDevelopers,
    backlogLoading,
    filteredBacklogTasks,
    removeTask,
  } = useBacklogManagement({
    goalTask: null,
    mainTab: 'backlog',
    nameFilter: '',
    selectedBoardId: selectedBoardId || undefined,
    statusFilter: 'all',
  });

  const { activeSprints, archivedSprints } = useMemo(
    () => organizeSprints(sprints),
    [sprints]
  );

  const {
    activeTaskId,
    handleDragStart,
    handleDragEnd,
  } = useBacklogDragAndDrop({
    activeSprints,
    boardId: selectedBoardId,
    backlogTasks: filteredBacklogTasks,
    backlogDevelopers,
    addTask,
    removeTask,
  });

  const { activeTask, activeTaskDevelopers } = useActiveTask({
    activeTaskId,
    backlogTasks: filteredBacklogTasks,
    backlogDevelopers,
    activeSprints,
    boardId: selectedBoardId,
  });

  const handleCreateSprint = () => {
    setIsCreateSprintModalOpen(true);
  };

  const handleSubmitSprint = async (data: {
    name: string;
    startDate: string;
    endDate: string;
  }) => {
    if (!selectedBoardId) {
      toast.error(t('backlog.toast.boardNotSelected'));
      return;
    }

    const result = await createSprint({
      name: data.name,
      boardId: selectedBoardId,
      startDate: data.startDate,
      endDate: data.endDate,
    });

    if (result.success) {
      toast.success(t('backlog.toast.sprintCreated'));
      queryClient.invalidateQueries({
        queryKey: isDemoPlannerBoards
          ? (['sprints', 'demo', selectedBoardId] as const)
          : (['sprints', selectedBoardId] as const),
      });
    } else {
      toast.error(result.error || t('backlog.toast.sprintCreateFailed'));
      throw new Error(result.error);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
      <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
        <div
          ref={horizontalScrollRef}
          className="flex h-full overflow-x-auto bg-gray-50 dark:bg-gray-900"
        >
          {/* Колонка бэклога */}
          <BacklogColumn
            developers={backlogDevelopers}
            loading={backlogLoading}
            tasks={filteredBacklogTasks}
          />

          {sprintsLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <Icon className="animate-spin h-6 w-6 mx-auto mb-2" name="spinner" />
                <p className="text-sm">{t('backlog.loadingSprints')}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-shrink-0">
                {activeSprints.map((sprint) => (
                  <SprintColumn key={sprint.id} boardId={selectedBoardId} sprint={sprint} />
                ))}

                <div className="flex-shrink-0 w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                  <Button
                    className="mx-3 flex h-auto min-h-0 w-full flex-col gap-0 border-2 border-dashed border-blue-300 p-5 hover:border-blue-500 hover:bg-blue-50 dark:border-blue-600 dark:hover:border-blue-400 dark:hover:bg-blue-900/20"
                    type="button"
                    variant="outline"
                    onClick={handleCreateSprint}
                  >
                    <Icon className="mb-2 h-6 w-6 text-blue-400 dark:text-blue-500" name="plus" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {t('backlog.createSprint')}
                    </span>
                  </Button>
                </div>
              </div>

              {archivedSprints.length > 0 && (
                <div className="flex-shrink-0 h-full">
                  <ArchivedSprintsList sprints={archivedSprints} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="w-[380px]">
            <TaskCard
              className="opacity-90 rotate-3"
              developers={activeTaskDevelopers}
              task={activeTask}
              variant="sidebar"
            />
          </div>
        ) : null}
      </DragOverlay>

      {selectedBoardId && (
        <CreateSprintModal
          isOpen={isCreateSprintModalOpen}
          sprints={sprints}
          onClose={() => setIsCreateSprintModalOpen(false)}
          onSubmit={handleSubmitSprint}
        />
      )}
    </DndContext>
  );
}

