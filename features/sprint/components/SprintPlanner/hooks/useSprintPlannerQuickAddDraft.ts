import type { CustomSelectOption } from '@/components/CustomSelect';
import type { QuickAddCreateFields, QuickAddDraftKind } from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { BoardListItem } from '@/lib/api/types';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { PositionHistoryOptions } from '@/lib/layers/application/mobx/stores/taskPositionsStore';
import type { Comment, Developer, Task, TaskParent, TaskPosition } from '@/types';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { getPartsPerDay } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { buildQuickAddQueueOptionsFromBoards } from '@/features/board/quickAddQueueOptions';
import { parseSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { buildFeatureDraftRowNamesById } from '@/features/swimlane/utils/featureDraftParentLabel';
import {
  collectQuickAddExcludedIssueKeys,
  collectUniqueSprintParentTasks,
  mergeQuickAddParentTasks,
} from '@/features/task/components/TaskBar/components/quickAddMenu/collectUniqueSprintParentTasks';
import { formatQuickAddParentOptionLabel } from '@/features/task/components/TaskBar/components/quickAddMenu/quickAddParentSelectHelpers';
import { upsertSprintTaskInQueries } from '@/features/task/hooks/useTasks';
import { useFeatureLanesApi } from '@/hooks/useApiStorage';
import { useRootStore } from '@/lib/layers';
import {
  emptyFeatureLanesDocument,
  isFeatureLaneDraftRowId,
  setFeatureLaneDraftIssueParent,
} from '@/lib/sprints/featureLanesDocument';

import {
  applyQuickAddDraftAssignee,
  applyQuickAddDraftCommentColor,
  applyQuickAddDraftDurationForKind,
  applyQuickAddDraftKind,
  applyQuickAddDraftParent,
  applyQuickAddDraftTitle,
  applyQuickAddImageDraftCardRow,
  plannerDraftParentFromKey,
  syncQuickAddCommentPresencePreview,
} from './applyQuickAddDraftFields';
import { cancelQuickAddDraft } from './cancelQuickAddDraft';
import { createSwimlaneCellFromPlacementTool } from './createQuickAddDraftInSwimlaneCell';
import { submitConvertedSwimlaneComment } from './submitConvertedSwimlaneComment';
import { submitExistingQuickAddDraft } from './submitExistingQuickAddDraft';
import { submitQuickAddCreatedIssueDraft } from './submitQuickAddCreatedIssueDraft';
import { completeQuickAddDiagramDraft } from './submitQuickAddDiagramDraft';
import { useCancelInlineDiagramDraftOnToolLeave } from './useCancelInlineDiagramDraftOnToolLeave';
import { useCancelInlineImageDraftOnToolLeave } from './useCancelInlineImageDraftOnToolLeave';
import { useCancelInlineNoteDraftOnToolLeave } from './useCancelInlineNoteDraftOnToolLeave';
import { useDiscardStickyNoteCreateDraftOnEscape } from './useDiscardStickyNoteCreateDraftOnEscape';
import { useSprintPlannerQuickAddImageActions } from './useSprintPlannerQuickAddImageActions';
import { useSprintPlannerQuickAddNoteActions } from './useSprintPlannerQuickAddNoteActions';

interface UseSprintPlannerQuickAddDraftParams {
  boardIdForPlannerData: number | null;
  boards: BoardListItem[];
  comments: Comment[];
  developers: Developer[];
  forDemoPlanner: boolean;
  selectedSprintId: number | null;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  sprintTimelineWorkingDays: number;
  swimlaneImagesVisible?: boolean;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  tasksMap: Map<string, Task>;
  closeNoteComposer: () => void;
  getQueueByBoardId: (boardId: number | null) => string | null;
  onCommentCreate: (comment: Comment) => void;
  onCommentDelete: (commentId: string, options?: { retargetLinksTo?: string }) => Promise<void> | void;
  onCommentUpdate: (commentId: string, text: string, color?: StickyNoteColor) => void;
  onDiagramEditorClose: () => void;
  onDiagramEditorOpen: (taskId: string) => void;
  onOpenCreatedTask: (task: Task) => void;
  savePosition: (
    position: TaskPosition,
    isQa: boolean,
    devKey?: string,
    force?: boolean,
    options?: { recordHistory?: boolean }
  ) => Promise<void>;
  setTaskPositions: (
    positions:
      | Map<string, TaskPosition>
      | ((prev: Map<string, TaskPosition>) => Map<string, TaskPosition>),
    options?: PositionHistoryOptions
  ) => void;
}

export function useSprintPlannerQuickAddDraft({
  boardIdForPlannerData,
  boards,
  closeNoteComposer,
  comments,
  developers,
  forDemoPlanner,
  getQueueByBoardId,
  onCommentCreate,
  onCommentDelete,
  onCommentUpdate,
  onDiagramEditorClose,
  onDiagramEditorOpen,
  onOpenCreatedTask,
  savePosition,
  selectedSprintId,
  setTaskPositions,
  setTasks,
  sprintTimelineWorkingDays,
  swimlaneImagesVisible = true,
  taskPositions,
  tasks,
  tasksMap,
}: UseSprintPlannerQuickAddDraftParams) {
  const { t } = useI18n();
  const { sprintPlannerUi } = useRootStore();
  const queryClient = useQueryClient();
  const [featureLanes, setFeatureLanes] = useFeatureLanesApi(selectedSprintId);
  const { handlePasteQuickAddNote, handleSubmitQuickAddCommentDraft } =
    useSprintPlannerQuickAddNoteActions({
      closeNoteComposer, comments, onCommentCreate, onCommentUpdate,
      setTaskPositions, setTasks, taskPositions, tasks,
    });
  const [quickAddSubmittingTaskId, setQuickAddSubmittingTaskId] = useState<string | null>(null);
  const { handleQuickAddDraftImageUrlChange, handleSubmitQuickAddImageDraft } =
    useSprintPlannerQuickAddImageActions({
      forDemoPlanner,
      onCommentCreate,
      selectedSprintId,
      setQuickAddSubmittingTaskId,
      setTaskPositions,
      setTasks,
      taskPositions,
      tasks,
    });

  const quickAddExcludedIssueKeys = useMemo(
    () => collectQuickAddExcludedIssueKeys(tasks, taskPositions),
    [taskPositions, tasks]
  );

  const quickAddQueueOptions = useMemo(
    () => buildQuickAddQueueOptionsFromBoards(boards),
    [boards]
  );

  const quickAddParentTasks = useMemo(
    () => mergeQuickAddParentTasks(collectUniqueSprintParentTasks(tasks), featureLanes?.draftRows ?? []),
    [featureLanes?.draftRows, tasks]
  );

  const featureDraftRowNamesById = useMemo(
    () => buildFeatureDraftRowNamesById(featureLanes?.draftRows ?? []),
    [featureLanes?.draftRows]
  );

  const persistPlannerDraftParent = useCallback(
    (issueKey: string, parent: TaskParent | undefined) => {
      const draftRowId = parent?.id?.trim();
      if (!draftRowId || !isFeatureLaneDraftRowId(draftRowId)) {
        return;
      }
      setFeatureLanes((prev) =>
        setFeatureLaneDraftIssueParent(prev ?? emptyFeatureLanesDocument(), issueKey, draftRowId)
      );
    },
    [setFeatureLanes]
  );

  const quickAddParentSelectOptions = useMemo((): CustomSelectOption<string>[] => {
    return [
      {
        label: t('sprintPlanner.swimlane.quickAddMenu.parentNone'),
        value: '',
      },
      ...quickAddParentTasks.map((parent) => ({
        label: formatQuickAddParentOptionLabel(parent, featureDraftRowNamesById),
        value: parent.key,
      })),
    ];
  }, [featureDraftRowNamesById, quickAddParentTasks, t]);

  const handleCreateTaskInSwimlaneCell = useCallback(
    ({
      assigneeId,
      day,
      imageFile,
      parent,
      part,
    }: {
      assigneeId: string;
      day: number;
      imageFile?: File;
      parent?: TaskParent;
      part: number;
    }) => {
      createSwimlaneCellFromPlacementTool({
        allowImageDraft: swimlaneImagesVisible,
        assigneeId,
        boardIdForPlannerData,
        day,
        developers,
        getQueueByBoardId,
        imageFile,
        onCreated: (taskId, kind) => {
          applyQuickAddImageDraftCardRow(taskId, kind, sprintPlannerUi);
          syncQuickAddCommentPresencePreview(sprintPlannerUi, taskId, kind);
        },
        parent,
        part,
        placementTool: sprintPlannerUi.placementTool,
        setTaskPositions,
        setTasks,
        stickyNoteColor: sprintPlannerUi.stickyNoteColor,
        t,
        tasksMap,
        timelineTotalParts: sprintTimelineWorkingDays * getPartsPerDay(),
      }).catch(() => undefined);
    },
    [
      boardIdForPlannerData,
      developers,
      getQueueByBoardId,
      setTaskPositions,
      setTasks,
      sprintPlannerUi,
      sprintTimelineWorkingDays,
      swimlaneImagesVisible,
      t,
      tasksMap,
    ]
  );

  const handleQuickAddDraftTitleChange = useCallback((taskId: string, title: string) => {
    setTasks((prev) => applyQuickAddDraftTitle(prev, taskId, title, (id, text) => sprintPlannerUi.setNoteEditPreview(id, { text })));
  }, [setTasks, sprintPlannerUi]);

  const handleQuickAddDraftCommentColorChange = useCallback((taskId: string, color: StickyNoteColor) => {
    sprintPlannerUi.setStickyNoteColor(color);
    sprintPlannerUi.setNoteEditPreview(taskId, { color });
    setTasks((prev) => applyQuickAddDraftCommentColor(prev, taskId, color));
  }, [setTasks, sprintPlannerUi]);

  const handleCancelQuickAddDraft = useCallback(
    (taskId: string) => {
      cancelQuickAddDraft({
        clearNoteEditPreview: sprintPlannerUi.clearNoteEditPreview,
        clearStickyNoteCardRowOverride: sprintPlannerUi.clearStickyNoteCardRowOverride,
        closeNoteComposer,
        setSubmittingTaskId: setQuickAddSubmittingTaskId,
        setTaskPositions,
        setTasks,
        submittingTaskId: quickAddSubmittingTaskId,
        taskId,
        tasks,
      });
    },
    [closeNoteComposer, quickAddSubmittingTaskId, setTaskPositions, setTasks, sprintPlannerUi, tasks]
  );

  useDiscardStickyNoteCreateDraftOnEscape({
    closeNoteComposer,
    setSubmittingTaskId: setQuickAddSubmittingTaskId,
    setTaskPositions,
    setTasks,
    submittingTaskId: quickAddSubmittingTaskId,
    tasks,
  });

  const cancelDraftOnToolLeave = {
    clearNoteEditPreview: sprintPlannerUi.clearNoteEditPreview,
    clearStickyNoteCardRowOverride: sprintPlannerUi.clearStickyNoteCardRowOverride,
    closeNoteComposer,
    placementTool: sprintPlannerUi.placementTool,
    setSubmittingTaskId: setQuickAddSubmittingTaskId,
    setTaskPositions,
    setTasks,
    submittingTaskId: quickAddSubmittingTaskId,
    tasks,
  };
  useCancelInlineNoteDraftOnToolLeave(cancelDraftOnToolLeave);
  useCancelInlineImageDraftOnToolLeave(cancelDraftOnToolLeave);
  useCancelInlineDiagramDraftOnToolLeave(cancelDraftOnToolLeave);

  const handleQuickAddDraftKindChange = useCallback(
    (taskId: string, kind: QuickAddDraftKind | undefined) => {
      const timelineTotalParts = sprintTimelineWorkingDays * getPartsPerDay();
      setTasks((prev) => {
        const next = applyQuickAddDraftKind(prev, taskId, kind);
        syncQuickAddCommentPresencePreview(
          sprintPlannerUi,
          taskId,
          kind,
          next.find((task) => task.id === taskId)?.name ?? ''
        );
        return kind === 'comment'
          ? applyQuickAddDraftCommentColor(next, taskId, sprintPlannerUi.stickyNoteColor)
          : next;
      });
      setTaskPositions((prev) =>
        applyQuickAddDraftDurationForKind(prev, taskId, kind, timelineTotalParts)
      );
      applyQuickAddImageDraftCardRow(taskId, kind, sprintPlannerUi);
    },
    [setTaskPositions, setTasks, sprintPlannerUi, sprintTimelineWorkingDays]
  );

  const handleSubmitQuickAddDiagramDraft = useCallback(
    (taskId: string, diagramName?: string) =>
      completeQuickAddDiagramDraft({
        comments,
        createdMessage: t('sprintPlanner.swimlane.quickAddMenu.createDiagramSuccess'),
        diagramName,
        failedMessage: t('sprintPlanner.swimlane.quickAddMenu.createDiagramFailed'),
        onCommentCreate,
        onDiagramEditorClose,
        onDiagramEditorOpen,
        selectedSprintId: forDemoPlanner ? null : selectedSprintId,
        setSubmittingTaskId: setQuickAddSubmittingTaskId,
        setTaskPositions,
        setTasks,
        taskId,
        taskPositions,
        tasks,
      }),
    [comments, forDemoPlanner, onCommentCreate, onDiagramEditorClose, onDiagramEditorOpen, selectedSprintId, setTaskPositions, setTasks, t, taskPositions, tasks]
  );

  const handleQuickAddDraftQueueChange = useCallback((taskId: string, queueKey: string) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, trackerQueue: queueKey } : task)));
  }, [setTasks]);
  const handleQuickAddDraftTypeChange = useCallback((taskId: string, type: string) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, type } : task)));
  }, [setTasks]);

  const handleQuickAddDraftParentChange = useCallback(
    (taskId: string, parentKey: string) => {
      setTasks((prev) => applyQuickAddDraftParent(prev, taskId, parentKey, quickAddParentTasks));
    },
    [quickAddParentTasks, setTasks]
  );

  const handleQuickAddDraftAssigneeChange = useCallback(
    (taskId: string, assigneeId: string) => {
      const assigneeName = developers.find((developer) => developer.id === assigneeId)?.name;
      setTasks((prev) => applyQuickAddDraftAssignee(prev, taskId, assigneeId, assigneeName));
    },
    [developers, setTasks]
  );

  const handleSubmitQuickAddDraft = useCallback(
    async (taskId: string, draftTitle?: string, fields?: QuickAddCreateFields) => {
      if (!selectedSprintId || !boardIdForPlannerData) return;
      const savedCommentId = parseSwimlaneCommentTaskId(taskId);
      if (savedCommentId) {
        const savedComment = comments.find((comment) => comment.id === savedCommentId);
        if (!savedComment) {
          return;
        }
        try {
          setQuickAddSubmittingTaskId(taskId);
          const converted = await submitConvertedSwimlaneComment({
            comment: savedComment,
            createFailedMessage: t('planning.featurePlanner.epicOccupancy.createTaskFailed'),
            defaultQueue: getQueueByBoardId(boardIdForPlannerData),
            draftTitle,
            fallbackTitle: t('sprintPlanner.swimlane.quickAddPreviewTitle'),
            fields,
            invalidateOccupancyQueries: () => {
              queryClient.invalidateQueries({
                queryKey: forDemoPlanner
                  ? (['tasks', 'demo', 'occupancy', selectedSprintId, boardIdForPlannerData] as const)
                  : (['tasks', 'occupancy', selectedSprintId, boardIdForPlannerData] as const),
              });
            },
            missingAssigneeMessage: t('sprintPlanner.swimlane.quickAddMenu.assigneeRequired'),
            missingQueueMessage: t('task.mutations.tasksReloadFailed'),
            onCommentDelete,
            plannerParent: plannerDraftParentFromKey(
              fields?.parentKey || savedComment.parent?.key || savedComment.parent?.id,
              quickAddParentTasks,
              featureDraftRowNamesById
            ),
            savePosition: (position, isQa) => savePosition(position, isQa),
            selectedSprintId,
            setTaskPositions: (updater) => setTaskPositions(updater, { recordHistory: true }),
            setTasks,
          });
          if (!converted.ok) {
            toast.error(converted.error);
            return;
          }
          persistPlannerDraftParent(converted.issueKey, converted.task.parent);
          upsertSprintTaskInQueries(queryClient, selectedSprintId, converted.task);
          closeNoteComposer();
          onOpenCreatedTask(converted.task);
          toast.success(
            t('planning.featurePlanner.epicOccupancy.createTaskSuccess', {
              key: converted.issueKey,
            })
          );
        } finally {
          setQuickAddSubmittingTaskId((prev) => (prev === taskId ? null : prev));
        }
        return;
      }
      try {
        setQuickAddSubmittingTaskId(taskId);
        await submitQuickAddCreatedIssueDraft({
          boardIdForPlannerData,
          draftTitle,
          featureDraftRowNamesById,
          fields,
          forDemoPlanner,
          getQueueByBoardId,
          onOpenCreatedTask,
          persistPlannerDraftParent,
          queryClient,
          quickAddParentTasks,
          savePosition,
          selectedSprintId,
          setTaskPositions,
          setTasks,
          t,
          taskId,
          taskPositions,
          tasks,
        });
      } finally {
        setQuickAddSubmittingTaskId((prev) => (prev === taskId ? null : prev));
      }
    },
    [
      boardIdForPlannerData,
      closeNoteComposer,
      comments,
      featureDraftRowNamesById,
      forDemoPlanner,
      getQueueByBoardId,
      onCommentDelete,
      onOpenCreatedTask,
      persistPlannerDraftParent,
      queryClient,
      quickAddParentTasks,
      savePosition,
      selectedSprintId,
      setTaskPositions,
      setTasks,
      t,
      taskPositions,
      tasks,
    ]
  );

  const handleSelectExistingQuickAddDraft = useCallback(
    async (taskId: string, selectedTask: Task) => {
      if (!selectedSprintId) {
        return;
      }
      const draftTask = tasks.find((task) => task.id === taskId);
      const plannerParent = plannerDraftParentFromKey(
        draftTask?.parent?.key ?? draftTask?.parent?.id,
        quickAddParentTasks,
        featureDraftRowNamesById
      );
      const taskToAdd = plannerParent ? { ...selectedTask, parent: plannerParent } : selectedTask;
      try {
        setQuickAddSubmittingTaskId(taskId);
        await submitExistingQuickAddDraft({
          queryClient,
          savePosition,
          selectedSprintId,
          selectedTask: taskToAdd,
          setTaskPositions,
          setTasks,
          t,
          taskId,
          taskPositions,
        });
        persistPlannerDraftParent(taskToAdd.id, plannerParent);
      } finally {
        setQuickAddSubmittingTaskId((prev) => (prev === taskId ? null : prev));
      }
    },
    [
      featureDraftRowNamesById,
      persistPlannerDraftParent,
      queryClient,
      quickAddParentTasks,
      savePosition,
      selectedSprintId,
      setTaskPositions,
      setTasks,
      t,
      taskPositions,
      tasks,
    ]
  );

  return {
    handleCancelQuickAddDraft,
    handleCreateTaskInSwimlaneCell,
    handlePasteQuickAddNote,
    handleQuickAddDraftAssigneeChange,
    handleQuickAddDraftCommentColorChange,
    handleQuickAddDraftImageUrlChange,
    handleQuickAddDraftKindChange,
    handleQuickAddDraftParentChange,
    handleQuickAddDraftQueueChange,
    handleQuickAddDraftTitleChange,
    handleQuickAddDraftTypeChange,
    handleSelectExistingQuickAddDraft,
    handleSubmitQuickAddCommentDraft,
    handleSubmitQuickAddDiagramDraft,
    handleSubmitQuickAddDraft,
    handleSubmitQuickAddImageDraft,
    featureDraftRowNamesById,
    quickAddExcludedIssueKeys,
    quickAddParentSelectOptions,
    quickAddQueueOptions,
    quickAddSubmittingTaskId,
  };
}
