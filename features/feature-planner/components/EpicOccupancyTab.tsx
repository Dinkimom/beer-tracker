'use client';

import type { StatusFilter, Task, TaskPosition } from '@/types';

import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

import { useConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { PARTS_PER_DAY } from '@/constants';
import { useIssueTrackerProviderCapabilities } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { ContextMenu } from '@/features/context-menu/components/ContextMenu';
import { EpicOccupancyView } from '@/features/sprint/components/SprintPlanner/occupancy/EpicOccupancyView';
import { OccupancyAssigneePicker } from '@/features/sprint/components/SprintPlanner/occupancy/OccupancyAssigneePicker';
import { useSprints } from '@/features/sprint/hooks/useSprints';
import { computeAssigneePointsStats } from '@/features/sprint/utils/assigneePointsStats';
import { getDevelopersForTaskSorted } from '@/features/sprint/utils/getDevelopersForTask';
import { getSegmentEditorRangeAndCells } from '@/features/sprint/utils/occupancyUtils';
import { useEpicOccupancyTaskOrder, useSelectedBoardStorage } from '@/hooks/useLocalStorage';
import { addIssueToSprint, changeIssueStatus, createRelatedIssue, removeIssueFromSprint } from '@/lib/api/issues';

import { useEpicOccupancyData } from '../hooks/useEpicOccupancyData';

import { CreateStoryTaskModal } from './CreateStoryTaskModal';

interface EpicOccupancyTabProps {
  epicId: string;
}

interface ContextMenuState {
  currentSprintId: number | null;
  position: { x: number; y: number };
  task: Task;
}

/**
 * Вкладка «Планирование» эпика — отображение запланированных фаз
 * стори и подзадач по спринтам текущего квартала.
 */
export function EpicOccupancyTab({ epicId }: EpicOccupancyTabProps) {
  const { t } = useI18n();
  const { supportsRelatedIssues } = useIssueTrackerProviderCapabilities();
  const [selectedBoardId] = useSelectedBoardStorage();
  const { data: sprints = [] } = useSprints(selectedBoardId);
  const [taskOrder, setTaskOrder] = useEpicOccupancyTaskOrder(epicId);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [createTaskParent, setCreateTaskParent] = useState<{ id: string; display: string; key?: string } | null>(null);
  const [isCreateLoading, setIsCreateLoading] = useState(false);
  const [segmentEditTaskId, setSegmentEditTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { confirm, DialogComponent } = useConfirmDialog();

  const {
    tasks,
    taskPositions,
    taskLinks,
    taskSprintMap,
    sprintInfos,
    allDevelopers,
    isLoading,
    handleAssigneeUpdate,
    handlePositionSave,
    handleAddLink,
    handleDeleteLink,
    handleRemoveFromPlan,
  } = useEpicOccupancyData({
    boardId: selectedBoardId,
    epicId,
    sprints,
    reloadToken,
    statusFilter,
  });

  const handleStatusFilterChange = useCallback((value: StatusFilter) => {
    setStatusFilter(value);
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, task: Task, _isBacklogTask?: boolean, _hideRemoveFromPlan?: boolean) => {
      e.preventDefault();
      const sprintInfo = taskSprintMap.get(task.id);
      setContextMenu({
        task,
        position: { x: e.clientX, y: e.clientY },
        currentSprintId: sprintInfo?.sprintId ?? null,
      });
    },
    [taskSprintMap]
  );

  const handleStatusChange = useCallback(
    async (taskId: string, transitionId: string) => {
      await changeIssueStatus(taskId, transitionId);
    },
    []
  );

  const handleMoveToSprint = useCallback(
    async (taskId: string, sprintId: number) => {
      await addIssueToSprint(taskId, sprintId);
      setContextMenu(null);
    },
    []
  );

  const handleRemoveFromSprint = useCallback(
    async (taskId: string) => {
      const sprintInfo = taskSprintMap.get(taskId);
      if (sprintInfo) {
        await removeIssueFromSprint(taskId, sprintInfo.sprintId);
        await handleRemoveFromPlan(taskId);
      }
      setContextMenu(null);
    },
    [taskSprintMap, handleRemoveFromPlan]
  );

  const handleDeleteLinkWithConfirm = useCallback(
    async (linkId: string) => {
      const ok = await confirm(t('planning.featurePlanner.epicOccupancy.removeLinkConfirm'), {
        title: t('planning.featurePlanner.epicOccupancy.removeLinkTitle'),
        confirmText: t('planning.featurePlanner.epicOccupancy.removeLinkConfirmAction'),
        cancelText: t('planning.featurePlanner.epicOccupancy.removeLinkCancelAction'),
        variant: 'destructive',
      });
      if (ok) await handleDeleteLink(linkId);
    },
    [confirm, handleDeleteLink, t]
  );

  const handleRemoveFromPlanCtx = useCallback(
    async (taskId: string) => {
      await handleRemoveFromPlan(taskId);
      setContextMenu(null);
    },
    [handleRemoveFromPlan]
  );

  // Picker смены исполнителя фазы (как в SprintPlanner)
  const [assigneePicker, setAssigneePicker] = useState<{
    anchorRect: DOMRect;
    position: TaskPosition;
    task: Task;
    taskName: string;
  } | null>(null);

  const handleOpenAssigneePicker = useCallback((data: {
    anchorRect: DOMRect;
    position: TaskPosition;
    task: Task;
    taskName: string;
  }) => {
    setAssigneePicker(data);
  }, []);

  const handleContextMenuAssigneeSelect = useCallback(
    (assigneeId: string) => {
      if (!contextMenu) return;
      const position = taskPositions.get(contextMenu.task.id);
      if (!position) return;
      const updated = { ...position, assignee: assigneeId };
      const isQa = contextMenu.task.team === 'QA';
      const assigneeName = allDevelopers.find((developer) => developer.id === assigneeId)?.name;
      handleAssigneeUpdate(contextMenu.task, assigneeId, assigneeName);
      handlePositionSave(updated, isQa, isQa ? contextMenu.task.originalTaskId : undefined);
      setContextMenu(null);
    },
    [allDevelopers, contextMenu, handleAssigneeUpdate, handlePositionSave, taskPositions]
  );

  const tasksMap = useMemo(() => new Map(tasks.map((t) => [t.id, t] as const)), [tasks]);

  const handleSplitPhaseIntoSegments = useCallback((task: Task) => {
    setContextMenu(null);
    setSegmentEditTaskId(task.id);
  }, []);

  const handleSegmentEditSave = useCallback(
    (position: TaskPosition, segments: Array<{ startDay: number; startPart: number; duration: number }>, isQa: boolean) => {
      const task = tasksMap.get(position.taskId);
      let next: TaskPosition;
      if (segments.length === 0) {
        const { rangeStartCell, totalCells } = getSegmentEditorRangeAndCells(position);
        next = {
          ...position,
          segments: [],
          startDay: Math.floor(rangeStartCell / PARTS_PER_DAY),
          startPart: rangeStartCell % PARTS_PER_DAY,
          duration: totalCells,
          plannedDuration: totalCells,
        };
      } else {
        const effectiveDuration = segments.reduce((s, seg) => s + seg.duration, 0);
        next = { ...position, segments, duration: effectiveDuration, plannedDuration: effectiveDuration };
      }
      handlePositionSave(next, isQa, isQa ? task?.originalTaskId : undefined);
    },
    [tasksMap, handlePositionSave]
  );

  const assigneePointsStats = useMemo(
    () => computeAssigneePointsStats(taskPositions, tasksMap),
    [taskPositions, tasksMap]
  );
  const sprintStartDate = useMemo(() => sprintInfos[0]?.startDate ?? new Date(), [sprintInfos]);

  const handleAssigneeSelect = useCallback(
    (assigneeId: string) => {
      if (!assigneePicker) return;
      const updated = { ...assigneePicker.position, assignee: assigneeId };
      const isQa = assigneePicker.task.team === 'QA';

      const assigneeName = allDevelopers.find((d) => d.id === assigneeId)?.name;
      handleAssigneeUpdate(assigneePicker.task, assigneeId, assigneeName);

      handlePositionSave(updated, isQa, isQa ? assigneePicker.task.originalTaskId : undefined);
      setAssigneePicker(null);
    },
    [assigneePicker, allDevelopers, handleAssigneeUpdate, handlePositionSave]
  );

  const handleCreateTaskForParent = useCallback(
    (parent: { id: string; display: string; key?: string }) => {
      if (!parent.key) return;
      setCreateTaskParent(parent);
    },
    []
  );

  const handleCreateTaskSubmit = useCallback(
    async (data: { title: string; description?: string | null; storyPoints?: number | null; testPoints?: number | null }) => {
      if (!createTaskParent?.key) return;
      try {
        setIsCreateLoading(true);
        const result = await createRelatedIssue(createTaskParent.key, {
          title: data.title,
          storyPoints: data.storyPoints ?? undefined,
          testPoints: data.testPoints ?? undefined,
          parent: createTaskParent.key,
        });

        if (!result.success) {
          toast.error(result.error || t('planning.featurePlanner.epicOccupancy.createTaskFailed'));
          return;
        }

        toast.success(
          t('planning.featurePlanner.epicOccupancy.createTaskSuccess', {
            key: result.issue?.key?.trim() || '—',
          })
        );
        setReloadToken((v) => v + 1);
        setCreateTaskParent(null);
      } finally {
        setIsCreateLoading(false);
      }
    },
    [createTaskParent, t]
  );

  if (!selectedBoardId) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400">
        {t('planning.featurePlanner.epicOccupancy.selectBoardToShow')}
      </div>
    );
  }

  return (
    <>
      <LoadingOverlay isVisible={isLoading} message={t('planning.featurePlanner.epicOccupancy.loadingTasksOverlay')} />
      {DialogComponent}
      <div className="flex flex-col h-full overflow-hidden">
        <EpicOccupancyView
          developers={allDevelopers}
          isLoading={false}
          segmentEditTaskId={segmentEditTaskId}
          sprintInfos={sprintInfos}
          statusFilter={statusFilter}
          taskLinks={taskLinks}
          taskOrder={taskOrder}
          taskPositions={taskPositions}
          tasks={tasks}
          onAddLink={handleAddLink}
          onContextMenu={handleContextMenu}
          onCreateTaskForParent={supportsRelatedIssues ? handleCreateTaskForParent : undefined}
          onDeleteLink={handleDeleteLinkWithConfirm}
          onOpenAssigneePicker={handleOpenAssigneePicker}
          onPositionSave={handlePositionSave}
          onSegmentEditCancel={() => setSegmentEditTaskId(null)}
          onSegmentEditSave={handleSegmentEditSave}
          onStatusFilterChange={handleStatusFilterChange}
          onTaskOrderChange={(order) => setTaskOrder(() => order)}
        />

      <CreateStoryTaskModal
        isLoading={isCreateLoading}
        isOpen={createTaskParent !== null}
        parent={createTaskParent}
        onClose={() => {
          if (isCreateLoading) return;
          setCreateTaskParent(null);
        }}
        onSubmit={handleCreateTaskSubmit}
      />

      {contextMenu &&
        createPortal(
          <ContextMenu
            assigneeOptions={{
              assigneePointsStats,
              availability: null,
              developers: allDevelopers,
              sprintStartDate,
            }}
            currentSprintId={contextMenu.currentSprintId}
            isBacklogTask={false}
            position={contextMenu.position}
            sprints={sprints}
            task={contextMenu.task}
            taskPositions={taskPositions}
            onAssigneeSelect={handleContextMenuAssigneeSelect}
            onClose={() => setContextMenu(null)}
            onCloseByClickOutside={() => setContextMenu(null)}
            onMoveToSprint={handleMoveToSprint}
            onRemoveFromPlan={handleRemoveFromPlanCtx}
            onRemoveFromSprint={handleRemoveFromSprint}
            onSplitPhaseIntoSegments={handleSplitPhaseIntoSegments}
            onStatusChange={handleStatusChange}
          />,
          document.body
        )}
      {assigneePicker && (
        <OccupancyAssigneePicker
          anchorRect={assigneePicker.anchorRect}
          assigneePointsStats={assigneePointsStats}
          availability={null}
          developers={getDevelopersForTaskSorted(allDevelopers, assigneePicker.task)}
          position={assigneePicker.position}
          sprintStartDate={sprintStartDate}
          task={assigneePicker.task}
          onClose={() => setAssigneePicker(null)}
          onSelect={handleAssigneeSelect}
        />
      )}
      </div>
    </>
  );
}
