'use client';

import type { StatusFilter } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { useBacklogManagement } from '@/features/sidebar/hooks/useBacklogManagement';
import { useSelectedBoardStorage } from '@/hooks/useLocalStorage';
import { createSprint } from '@/lib/beerTrackerApi';

import { useActiveTask } from '../hooks/useActiveTask';
import { useBacklogDragAndDrop } from '../hooks/useBacklogDragAndDrop';
import { useBacklogFilterPeople } from '../hooks/useBacklogFilterPeople';
import { filterTasksByAssignees } from '../utils/backlogFilterPeople';
import { backlogTaskPreviewResetKey } from '../utils/backlogTaskPreview';
import { organizeSprints } from '../utils/sprintUtils';

import { ArchivedSprintsList } from './ArchivedSprintsList';
import { BacklogBulkToolbar } from './BacklogBulkToolbar';
import { BacklogColumn } from './BacklogColumn';
import { BacklogPageFilters } from './BacklogPageFilters';
import { BacklogSelectionProvider } from './BacklogSelectionProvider';
import { BacklogTaskRowView } from './BacklogTaskRowView';
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
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(() => new Set());
  const filtersActive = nameFilter.trim() !== '' || statusFilter !== 'all' || assigneeIds.size > 0;
  const bulkMovingRef = useRef(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const {
    addTask,
    backlogDevelopers,
    backlogLoading,
    backlogTasks,
    filteredBacklogTasks,
    removeTask,
  } = useBacklogManagement({
    goalTask: null,
    mainTab: 'backlog',
    nameFilter,
    selectedBoardId: selectedBoardId || undefined,
    statusFilter,
  });

  const { activeSprints, archivedSprints } = useMemo(
    () => organizeSprints(sprints),
    [sprints]
  );
  const sprintIds = useMemo(() => activeSprints.map((sprint) => sprint.id), [activeSprints]);
  const people = useBacklogFilterPeople({
    backlogDevelopers,
    backlogTasks,
    boardId: selectedBoardId,
    sprintIds,
  });
  const visibleBacklogTasks = useMemo(
    () => filterTasksByAssignees(filteredBacklogTasks, assigneeIds),
    [assigneeIds, filteredBacklogTasks]
  );

  const toggleAssignee = (id: string) => {
    setAssigneeIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetFilters = () => {
    setNameFilter('');
    setStatusFilter('all');
    setAssigneeIds(new Set());
  };

  const {
    activeTaskId,
    handleDragStart,
    handleDragEnd,
  } = useBacklogDragAndDrop({
    activeSprints,
    boardId: selectedBoardId,
    backlogTasks: visibleBacklogTasks,
    backlogDevelopers,
    bulkMovingRef,
    addTask,
    removeTask,
  });

  const { activeTask, activeTaskDevelopers } = useActiveTask({
    activeTaskId,
    backlogTasks: visibleBacklogTasks,
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
    <BacklogSelectionProvider>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
        <div className="flex min-h-0 w-full flex-1 flex-col gap-3">
          <BacklogPageFilters
            assigneeIds={assigneeIds}
            nameFilter={nameFilter}
            people={people}
            statusFilter={statusFilter}
            onAssigneeToggle={toggleAssignee}
            onNameFilterChange={setNameFilter}
            onReset={resetFilters}
            onStatusFilterChange={setStatusFilter}
          />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-3">
              {sprintsLoading ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-8 text-sm text-gray-500 dark:border-gray-700 dark:bg-ds-surface-header dark:text-gray-400">
                  <Icon className="h-4 w-4 animate-spin" name="spinner" />
                  {t('backlog.loadingSprints')}
                </div>
              ) : (
                activeSprints.map((sprint) => (
                  <SprintColumn
                    key={sprint.id}
                    assigneeIds={assigneeIds}
                    boardId={selectedBoardId}
                    nameFilter={nameFilter}
                    sprint={sprint}
                    statusFilter={statusFilter}
                  />
                ))
              )}

              <Button
                className="!h-12 w-full !rounded-2xl !border-dashed"
                type="button"
                variant="outline"
                onClick={handleCreateSprint}
              >
                <Icon className="h-4 w-4" name="plus" />
                {t('backlog.createSprint')}
              </Button>

              <BacklogColumn
                developers={backlogDevelopers}
                emptyLabel={filtersActive ? t('backlog.filters.noMatches') : undefined}
                loading={backlogLoading}
                previewResetKey={backlogTaskPreviewResetKey({ assigneeIds, nameFilter, statusFilter })}
                tasks={visibleBacklogTasks}
                totalTaskCount={backlogTasks.length}
              />

              {archivedSprints.length > 0 ? <ArchivedSprintsList sprints={archivedSprints} /> : null}
            </div>
          </div>
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
              <BacklogTaskRowView developers={activeTaskDevelopers} task={activeTask} />
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
      <BacklogBulkToolbar
        activeSprints={activeSprints}
        addTask={addTask}
        backlogDevelopers={backlogDevelopers}
        backlogTasks={backlogTasks}
        boardId={selectedBoardId}
        movingRef={bulkMovingRef}
        removeTask={removeTask}
      />
    </BacklogSelectionProvider>
  );
}

