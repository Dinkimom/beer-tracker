import type { CustomSelectOption } from '@/components/CustomSelect';
import type { SprintBoard } from '@/features/sprint/model/SprintBoard';
import type {
  QuickAddController,
  QuickAddDraftKind,
} from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { BoardListItem } from '@/lib/api/types';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { Comment, Task, TaskParent } from '@/types';

import { useCallback, useMemo, useRef, useState } from 'react';

import { getPartsPerDay } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { buildQuickAddQueueOptionsFromBoards } from '@/features/board/quickAddQueueOptions';
import { buildFeatureDraftRowNamesById, formatTaskParentLabel } from '@/features/swimlane/utils/featureDraftParentLabel';
import {
  collectQuickAddExcludedIssueKeys,
  collectUniqueSprintParentTasks,
  mergeQuickAddParentTasks,
} from '@/features/task/components/TaskBar/components/quickAddMenu/collectUniqueSprintParentTasks';
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
  applyQuickAddDraftParent,
  applyQuickAddDraftTitle,
  applyQuickAddImageDraftCardRow,
  changeQuickAddDraftKind,
  syncQuickAddCommentPresencePreview,
} from './applyQuickAddDraftFields';
import { cancelQuickAddDraft } from './cancelQuickAddDraft';
import { createSwimlaneCellFromPlacementTool } from './createQuickAddDraftInSwimlaneCell';
import { completeQuickAddDiagramDraft } from './submitQuickAddDiagramDraft';
import { useCancelInlineDraftsOnToolLeave } from './useCancelInlineDraftsOnToolLeave';
import { useDiscardStickyNoteCreateDraftOnEscape } from './useDiscardStickyNoteCreateDraftOnEscape';
import { useSprintPlannerQuickAddImageActions } from './useSprintPlannerQuickAddImageActions';
import { useSprintPlannerQuickAddIssueActions } from './useSprintPlannerQuickAddIssueActions';
import { useSprintPlannerQuickAddNoteActions } from './useSprintPlannerQuickAddNoteActions';

interface UseSprintPlannerQuickAddDraftParams {
  /** Спринт, задачи, разработчики, заметки и позиции (с сохранением) — из модели доски. */
  board: SprintBoard;
  boardIdForPlannerData: number | null;
  boards: BoardListItem[];
  forDemoPlanner: boolean;
  sprintTimelineWorkingDays: number;
  swimlaneImagesVisible?: boolean;
  tasksMap: Map<string, Task>;
  getQueueByBoardId: (boardId: number | null) => string | null;
  onCommentCreate: (comment: Comment) => void;
  onCommentDelete: (commentId: string, options?: { retargetLinksTo?: string }) => Promise<void> | void;
  onCommentUpdate: (commentId: string, text: string, color?: StickyNoteColor) => void;
}

export function useSprintPlannerQuickAddDraft({
  board,
  boardIdForPlannerData,
  boards,
  forDemoPlanner,
  getQueueByBoardId,
  onCommentCreate,
  onCommentDelete,
  onCommentUpdate,
  sprintTimelineWorkingDays,
  swimlaneImagesVisible = true,
  tasksMap,
}: UseSprintPlannerQuickAddDraftParams) {
  const { developers, displayPositions: taskPositions, tasks, updateTasks: setTasks } = board;
  const comments = board.comments.items;
  const { setPositionsWithSave: setTaskPositions } = board.positions;
  const { t } = useI18n();
  const { sprintPlannerUi } = useRootStore();
  // Окна заметки и схемы, панель задачи — у UI-стора; спринт — у модели.
  const { closeDiagramEditor: onDiagramEditorClose, closeNoteComposer, openDiagramEditor: onDiagramEditorOpen } =
    sprintPlannerUi.tools;
  const { openTaskInfoPanel: onOpenCreatedTask } = sprintPlannerUi.overlays;
  const selectedSprintId = board.sprintId;
  const keepInlineCardDraftRef = useRef(false);
  const [featureLanes, setFeatureLanes] = useFeatureLanesApi(selectedSprintId);
  const { handlePasteQuickAddNote, handleSubmitQuickAddCommentDraft } =
    useSprintPlannerQuickAddNoteActions({ board, closeNoteComposer, onCommentCreate, onCommentUpdate });
  const [quickAddSubmittingTaskId, setQuickAddSubmittingTaskId] = useState<string | null>(null);
  const { handleQuickAddDraftImageUrlChange, handleSubmitQuickAddImageDraft } =
    useSprintPlannerQuickAddImageActions({ board, forDemoPlanner, onCommentCreate, setQuickAddSubmittingTaskId });

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
        label: formatTaskParentLabel(parent, featureDraftRowNamesById),
        value: parent.key,
      })),
    ];
  }, [featureDraftRowNamesById, quickAddParentTasks, t]);

  const handleCreateTaskInSwimlaneCell = useCallback(
    ({
      assigneeId, day, imageFile, parent, part,
    }: {
      assigneeId: string; day: number; imageFile?: File; parent?: TaskParent; part: number;
    }) => {
      const placementTool = sprintPlannerUi.tools.placementTool;
      createSwimlaneCellFromPlacementTool({
        allowImageDraft: swimlaneImagesVisible,
        assigneeId,
        boardIdForPlannerData,
        day,
        developers,
        getQueueByBoardId,
        imageFile,
        onCommentCreate,
        onCreated: (taskId, kind) => {
          applyQuickAddImageDraftCardRow(taskId, kind, sprintPlannerUi.cards);
          syncQuickAddCommentPresencePreview(sprintPlannerUi.tools, taskId, kind);
        },
        parent,
        part,
        placementTool,
        getPlacementTool: () => sprintPlannerUi.tools.placementTool,
        keepInlineCardDraftRef,
        setPlacementTool: sprintPlannerUi.tools.setPlacementTool,
        setTaskPositions,
        setTasks,
        stickyNoteColor: sprintPlannerUi.tools.stickyNoteColor,
        t,
        tasksMap,
        timelineTotalParts: sprintTimelineWorkingDays * getPartsPerDay(),
      }).catch(() => undefined);
    },
    [
      boardIdForPlannerData,
      developers,
      getQueueByBoardId,
      onCommentCreate,
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
    setTasks((prev) => applyQuickAddDraftTitle(prev, taskId, title, (id, text) => sprintPlannerUi.tools.setNoteEditPreview(id, { text })));
  }, [setTasks, sprintPlannerUi]);

  const handleQuickAddDraftCommentColorChange = useCallback((taskId: string, color: StickyNoteColor) => {
    sprintPlannerUi.tools.setStickyNoteColor(color);
    sprintPlannerUi.tools.setNoteEditPreview(taskId, { color });
    setTasks((prev) => applyQuickAddDraftCommentColor(prev, taskId, color));
  }, [setTasks, sprintPlannerUi]);

  const handleCancelQuickAddDraft = useCallback(
    (taskId: string) => {
      cancelQuickAddDraft({
        clearNoteEditPreview: sprintPlannerUi.tools.clearNoteEditPreview,
        clearStickyNoteCardRowOverride: sprintPlannerUi.cards.clearStickyNoteCardRowOverride,
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
    board,
    clearNoteEditPreview: sprintPlannerUi.tools.clearNoteEditPreview,
    clearStickyNoteCardRowOverride: sprintPlannerUi.cards.clearStickyNoteCardRowOverride,
    closeNoteComposer,
    placementTool: sprintPlannerUi.tools.placementTool,
    setSubmittingTaskId: setQuickAddSubmittingTaskId,
    submittingTaskId: quickAddSubmittingTaskId,
    keepInlineCardDraftRef,
  };
  useCancelInlineDraftsOnToolLeave(cancelDraftOnToolLeave);

  const handleQuickAddDraftKindChange = useCallback(
    (taskId: string, kind: QuickAddDraftKind | undefined) =>
      changeQuickAddDraftKind({
        doesNotFitMessage: t('sprintPlanner.swimlane.quickAddMenu.kindDoesNotFitSprint'),
        kind,
        setTaskPositions,
        setTasks,
        taskId,
        taskPositions,
        timelineTotalParts: sprintTimelineWorkingDays * getPartsPerDay(),
        ui: sprintPlannerUi,
      }),
    [setTaskPositions, setTasks, sprintPlannerUi, sprintTimelineWorkingDays, t, taskPositions]
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

  const { handleSelectExistingQuickAddDraft, handleSubmitQuickAddDraft } = useSprintPlannerQuickAddIssueActions({
    board,
    boardIdForPlannerData,
    closeNoteComposer,
    featureDraftRowNamesById,
    forDemoPlanner,
    getQueueByBoardId,
    onCommentDelete,
    onOpenCreatedTask,
    persistPlannerDraftParent,
    quickAddParentTasks,
    setQuickAddSubmittingTaskId,
    sprintTimelineWorkingDays,
  });

  const quickAdd = useMemo(
    (): QuickAddController => ({
      onCancelQuickAddDraft: handleCancelQuickAddDraft,
      onPasteQuickAddNote: handlePasteQuickAddNote,
      onQuickAddDraftAssigneeChange: handleQuickAddDraftAssigneeChange,
      onQuickAddDraftCommentColorChange: handleQuickAddDraftCommentColorChange,
      onQuickAddDraftImageUrlChange: handleQuickAddDraftImageUrlChange,
      onQuickAddDraftKindChange: handleQuickAddDraftKindChange,
      onQuickAddDraftParentChange: handleQuickAddDraftParentChange,
      onQuickAddDraftQueueChange: handleQuickAddDraftQueueChange,
      onQuickAddDraftTitleChange: handleQuickAddDraftTitleChange,
      onQuickAddDraftTypeChange: handleQuickAddDraftTypeChange,
      onSelectExistingQuickAddDraft: handleSelectExistingQuickAddDraft,
      onSubmitQuickAddCommentDraft: handleSubmitQuickAddCommentDraft,
      onSubmitQuickAddDiagramDraft: handleSubmitQuickAddDiagramDraft,
      onSubmitQuickAddDraft: handleSubmitQuickAddDraft,
      onSubmitQuickAddImageDraft: handleSubmitQuickAddImageDraft,
      quickAddBoardId: boardIdForPlannerData,
      quickAddExcludedIssueKeys,
      quickAddParentSelectOptions,
      quickAddQueueOptions,
      quickAddSubmittingTaskId,
    }),
    [
      boardIdForPlannerData,
      handleCancelQuickAddDraft,
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
      quickAddExcludedIssueKeys,
      quickAddParentSelectOptions,
      quickAddQueueOptions,
      quickAddSubmittingTaskId,
    ]
  );

  return { featureDraftRowNamesById, handleCreateTaskInSwimlaneCell, quickAdd };
}
