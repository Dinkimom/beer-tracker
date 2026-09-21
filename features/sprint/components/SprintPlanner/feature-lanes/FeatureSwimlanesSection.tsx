'use client';

import type { SwimlanesSectionProps } from '../components/SwimlanesSection.types';
import type { Task, TaskParent } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { useCallback, useMemo } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import {
  buildFeatureSwimlaneProjection,
  collectFeatureLaneTaskIdsWaitingForDrafts,
  omitTaskPositionsByIds,
  overlayFeatureLaneDraftParents,
  projectCommentsOntoFeatureRows,
  projectTaskPositionsToFeatureRows,
} from '@/features/swimlane/utils/featureSwimlaneRows';
import { FeatureLaneCardUiProvider } from '@/features/task/components/TaskCard/FeatureLaneCardUiContext';
import { useFeatureLanesApi } from '@/hooks/useApiStorage';

import { SwimlanesSection } from '../components/SwimlanesSection';

import { useFeatureLaneDraftConvert } from './useFeatureLaneDraftConvert';
import { useFeatureLaneRowManagement } from './useFeatureLaneRowManagement';
import { useFeatureLaneRowRemove } from './useFeatureLaneRowRemove';

export type FeatureSwimlanesSectionProps = Omit<SwimlanesSectionProps, 'viewMode'> & {
  onCommentsLeftSprint?: (commentIds: string[]) => void;
  onMoveToSprint?: (
    taskId: string,
    sprintId: number,
    options?: { notify?: boolean }
  ) => Promise<void>;
  onRemoveFromSprint?: (taskId: string, options?: { notify?: boolean }) => Promise<void>;
  sprints?: readonly SprintListItem[];
};

/**
 * POC: свимлейн, нарезанный по родителю (стори/эпик).
 * Карточки и позиции те же; строка — фича, исполнитель остаётся на аватаре.
 */
export function FeatureSwimlanesSection({
  onCommentsLeftSprint,
  onMoveToSprint,
  onRemoveFromSprint,
  sprints = [],
  ...props
}: FeatureSwimlanesSectionProps) {
  const { t } = useI18n();
  const [lanes, setLanes, lanesLoaded] = useFeatureLanesApi(props.selectedSprintId);
  const boardLabels = useMemo(
    () => ({
      noParentLabel: t('task.grouping.noParent'),
      teamLaneLabel: t('sprintPlanner.swimlane.teamLane.name'),
    }),
    [t]
  );
  const overlaidTasks = useMemo(
    () => overlayFeatureLaneDraftParents(props.allTasksForDrag, lanes),
    [lanes, props.allTasksForDrag]
  );
  const waitingForDraftsTaskIds = useMemo(
    () => collectFeatureLaneTaskIdsWaitingForDrafts(overlaidTasks, lanesLoaded),
    [lanesLoaded, overlaidTasks]
  );
  const tasksForLanes = useMemo(
    () => overlaidTasks.filter((task) => !waitingForDraftsTaskIds.has(task.id)),
    [overlaidTasks, waitingForDraftsTaskIds]
  );
  const tasksMapForLanes = useMemo(() => {
    const next = new Map(props.tasksMap);
    for (const taskId of waitingForDraftsTaskIds) {
      next.delete(taskId);
    }
    for (const task of tasksForLanes) {
      next.set(task.id, task);
    }
    return next;
  }, [props.tasksMap, tasksForLanes, waitingForDraftsTaskIds]);
  const projection = useMemo(
    () => buildFeatureSwimlaneProjection(tasksForLanes, boardLabels, props.taskPositions),
    [boardLabels, props.taskPositions, tasksForLanes]
  );
  const rowManagement = useFeatureLaneRowManagement({
    boardLabels,
    lanes,
    projectionRows: projection.rows,
    rowMetaById: projection.rowMetaById,
    setLanes,
    sprintId: props.selectedSprintId,
    tasks: tasksForLanes,
  });
  const setTasks = props.setTasks;
  const handleLocalTaskParentChange = useCallback(
    (taskId: string, parent: TaskParent | null) => {
      setTasks?.((prev) =>
        prev.map((task: Task) => {
          if (task.id !== taskId) {
            return task;
          }
          return parent ? { ...task, parent } : { ...task, parent: undefined };
        })
      );
    },
    [setTasks]
  );
  const draftConvert = useFeatureLaneDraftConvert({
    comments: props.comments,
    onCommentParentChange: props.onCommentParentChange,
    onLocalTaskParentChange: handleLocalTaskParentChange,
    onPinTrackerRow: rowManagement.pinTrackerRow,
    onReplaceDraftRow: rowManagement.replaceDraftRow,
    selectedSprintId: props.selectedSprintId,
    tasks: tasksForLanes,
  });
  const rowActions = useFeatureLaneRowRemove({
    comments: props.comments,
    onClearTaskParent: (taskId) => handleLocalTaskParentChange(taskId, null),
    onCommentDelete: props.onCommentDelete,
    onCommentsLeftSprint,
    onDeleteAnnotationTask: props.onCancelQuickAddDraft,
    onMoveToSprint,
    onRemoveBoardRow: rowManagement.removeBoardRow,
    onRemoveDraftRow: rowManagement.removeDraftRow,
    onRemoveFromSprint,
    onTransferDraftRow: rowManagement.transferDraftRowToSprint,
    selectedSprintId: props.selectedSprintId,
    sprints,
    tasks: tasksForLanes,
  });
  const projectedPositions = useMemo(() => {
    const projected = projectTaskPositionsToFeatureRows(props.taskPositions, tasksMapForLanes);
    return omitTaskPositionsByIds(projected, waitingForDraftsTaskIds);
  }, [props.taskPositions, tasksMapForLanes, waitingForDraftsTaskIds]);
  const laneComments = useMemo(
    () => projectCommentsOntoFeatureRows(props.comments),
    [props.comments]
  );
  const handleCreateOnFeatureRow = useCallback(
    (data: { assigneeId: string; day: number; imageFile?: File; part: number }) => {
      const parent = rowManagement.rowMetaById.get(data.assigneeId)?.parent ?? undefined;
      props.onCreateTaskInCell?.({
        ...data,
        parent,
      });
    },
    [props, rowManagement.rowMetaById]
  );
  const tasksByAssignee = useMemo(() => {
    const next = new Map(projection.tasksByRowId);
    for (const row of rowManagement.allRows) {
      if (!next.has(row.id)) {
        next.set(row.id, []);
      }
    }
    return next;
  }, [projection.tasksByRowId, rowManagement.allRows]);

  return (
    <FeatureLaneCardUiProvider
      convertBoardId={props.boardId}
      convertIsSubmitting={draftConvert.isSubmitting}
      convertQueueOptions={props.quickAddQueueOptions ?? []}
      moveFeatureRow={rowActions.moveRow}
      removeFeatureRow={rowActions.removeRow}
      renameFeatureRow={rowManagement.renameDraftRow}
      rowTitleById={rowManagement.rowTitleById}
      selectedSprintId={props.selectedSprintId}
      sprints={sprints}
      onAddFeatureRow={rowManagement.addDraftRow}
      onAddFeatureRowFromExisting={draftConvert.attachExisting}
      onAddFeatureRowFromNew={draftConvert.createRow}
      onConvertFeatureRow={draftConvert.convertRow}
      onConvertFeatureRowExisting={draftConvert.convertExisting}
    >
      <SwimlanesSection
        {...props}
        allTasksForDrag={tasksForLanes}
        comments={laneComments}
        developersManagement={rowManagement.developersManagement}
        hideTeamLane
        occupancyValidationPositions={props.taskPositions}
        swimlaneCalendarBusyEnabled={false}
        swimlaneFactTimelineEnabled={false}
        taskPositions={projectedPositions}
        tasksByAssignee={tasksByAssignee}
        tasksMap={tasksMapForLanes}
        viewMode="full"
        onCreateTaskInCell={handleCreateOnFeatureRow}
      />
      {rowActions.DialogComponent}
    </FeatureLaneCardUiProvider>
  );
}
