'use client';

import type { QuickAddMode, SwimlaneQuickAddMenuProps } from './types';

import { useCallback, useRef, useState } from 'react';

import { ZIndex } from '@/constants';
import {
  QUICK_ADD_KIND_PICKER_WIDTH_PX,
  useFollowAnchorRect,
} from '@/hooks/useFollowAnchorRect';
import {
  useSwimlaneImagesVisibleStorage,
  useSwimlaneNotesVisibleStorage,
} from '@/hooks/useLocalStorage';
import { parseStickyNoteColor } from '@/lib/comments/stickyNoteColor';
import { useRootStore } from '@/lib/layers';

import { useQuickAddIssueSearch } from './hooks/useQuickAddIssueSearch';
import { useQuickAddLockedDraftFields } from './hooks/useQuickAddLockedDraftFields';
import { useQuickAddMenuBootstrap } from './hooks/useQuickAddMenuBootstrap';
import { useQuickAddMenuFocus } from './hooks/useQuickAddMenuFocus';
import { useQuickAddParentSelect } from './hooks/useQuickAddParentSelect';
import { useQuickAddQueueSelect } from './hooks/useQuickAddQueueSelect';
import { QuickAddMenu } from './QuickAddMenu';
import { quickAddDraftKindToMode, splitQuickAddDraftFields } from './quickAddMenuDraftState';
import {
  buildQuickAddRootPickerItems,
  filterQuickAddVisibleModes,
  shouldOpenQuickAddKindPicker,
  shouldShowQuickAddBootstrapLoader,
} from './quickAddMenuModes';
import { QuickAddMenuPanels } from './QuickAddMenuPanels';
import { useQuickAddMenuNavigation } from './useQuickAddMenuNavigation';

export type { SwimlaneQuickAddMenuProps };

const SELECT_MENU_Z_INDEX = ZIndex.popupContent + 20;

function resolveQuickAddPopoverMinWidth(isPickerStep: boolean): number | undefined {
  if (isPickerStep) {
    return QUICK_ADD_KIND_PICKER_WIDTH_PX;
  }
  return undefined;
}

export function SwimlaneQuickAddMenu({
  anchorId,
  assigneeId,
  availabilityStartDate,
  boardId,
  commentColor,
  draftKind,
  excludedIssueKeys,
  imageUrl,
  isSubmitting,
  issueType,
  lockedMode,
  requiresAssignee = false,
  showAssigneeSelect = false,
  onAssigneeChange,
  onCancel,
  onCommentColorChange,
  onCreate,
  onCreateAvailability,
  onDraftKindChange,
  onImageUrlChange,
  onIssueTypeChange,
  onParentChange,
  onPasteNote,
  onQueueChange,
  onSelectExisting,
  onTitleChange,
  parentKey,
  parentSelectOptions,
  queueKey,
  queueOptions,
  taskId,
  title,
}: SwimlaneQuickAddMenuProps) {
  const sprintPlannerUi = useRootStore().sprintPlannerUi;
  const [notesVisible] = useSwimlaneNotesVisibleStorage();
  const [imagesVisible] = useSwimlaneImagesVisibleStorage();
  const initialDraft = splitQuickAddDraftFields({ draftKind, imageUrl, lockedMode, title });
  const [mode, setMode] = useState<QuickAddMode>(
    lockedMode ?? quickAddDraftKindToMode(draftKind, imageUrl)
  );
  const [step, setStep] = useState<'form' | 'picker'>(() =>
    shouldOpenQuickAddKindPicker({ draftKind, imageUrl, lockedMode }) ? 'picker' : 'form'
  );
  const [canReturnToPicker] = useState(() =>
    shouldOpenQuickAddKindPicker({ draftKind, imageUrl, lockedMode })
  );
  const [draftTitle, setDraftTitle] = useState(initialDraft.title);
  const draftComment = initialDraft.comment;
  const draftCaption = initialDraft.caption;
  const draftDiagramName = initialDraft.diagramName;
  const draftCommentColor = parseStickyNoteColor(commentColor);
  const [draftImageUrl, setDraftImageUrl] = useState(imageUrl);
  const [draftAssigneeId, setDraftAssigneeId] = useState(assigneeId?.trim() ?? '');
  const newTaskInputRef = useRef<HTMLTextAreaElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const diagramNameRef = useRef<HTMLInputElement>(null);
  const imageCaptionRef = useRef<HTMLInputElement>(null);
  const imageDropzoneRef = useRef<HTMLLabelElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    createFields,
    effectiveIssueType,
    effectiveParentKey,
    effectiveQueueKey,
    handleIssueTypeChange,
    handleParentChange,
    handleQueueChange,
  } = useQuickAddLockedDraftFields({
    issueType,
    lockedMode,
    onIssueTypeChange,
    onParentChange,
    onQueueChange,
    parentKey,
    queueKey,
  });

  const getAnchor = useCallback(() => document.getElementById(anchorId), [anchorId]);
  const anchorRect = useFollowAnchorRect(getAnchor, true);

  const { isInitialLoading, issueTypeOptions, queueNamesByKey, setQueueNamesByKey } =
    useQuickAddMenuBootstrap({
      issueType: effectiveIssueType,
      onIssueTypeChange: handleIssueTypeChange,
      queueKey: effectiveQueueKey,
      queueOptions,
    });

  const {
    handleQueueSearchQueryChange,
    isQueueSearching,
    queueSelectOptions,
    selectedQueueName,
  } = useQuickAddQueueSelect({
    queueKey: effectiveQueueKey,
    queueNamesByKey,
    queueOptions,
    setQueueNamesByKey,
  });

  const issueSearch = useQuickAddIssueSearch({
    boardId,
    excludedIssueKeys,
    mode,
  });

  const parentSelect = useQuickAddParentSelect({
    boardId,
    parentKey: effectiveParentKey,
    parentSelectOptions,
  });

  const showLoader = shouldShowQuickAddBootstrapLoader(isInitialLoading, mode, step);
  const visibleModes = filterQuickAddVisibleModes({
    availabilityModeEnabled: false,
    commentModeEnabled: notesVisible,
    imageModeEnabled: imagesVisible,
    pasteNoteEnabled: false,
    taskModesEnabled: true,
  });
  const {
    handleBackToPicker,
    handleModeChange,
    handleRequestClose,
  } = useQuickAddMenuNavigation({
    availabilityStartDate,
    draftCaption,
    draftComment,
    draftCommentColor,
    draftDiagramName,
    draftTitle,
    imagesVisible,
    isSubmitting,
    lockedMode,
    notesVisible,
    onCancel,
    onCommentColorChange,
    onCreateAvailability,
    onDraftKindChange,
    onImageUrlChange,
    onPasteNote,
    onTitleChange,
    setDraftImageUrl,
    setMode,
    setStep,
    sprintPlannerUi,
    taskId,
  });
  const pickerItems = buildQuickAddRootPickerItems(visibleModes);

  useQuickAddMenuFocus({
    commentInputRef,
    diagramNameRef,
    enabled: step === 'form',
    imageCaptionRef,
    imageDropzoneRef,
    imageUrl: draftImageUrl,
    isContentReady: Boolean(anchorRect),
    isInitialLoading: showLoader,
    mode,
    newTaskInputRef,
    searchInputRef,
  });

  const handleTaskTitleChange = useCallback(
    (value: string) => {
      setDraftTitle(value);
      onTitleChange(value);
    },
    [onTitleChange]
  );

  const handleCreateTask = useCallback(() => {
    const nextAssigneeId = draftAssigneeId.trim() || undefined;
    onCreate(
      draftTitle,
      createFields
        ? { ...createFields, ...(nextAssigneeId ? { assigneeId: nextAssigneeId } : {}) }
        : undefined
    );
  }, [createFields, draftAssigneeId, draftTitle, onCreate]);

  if (!anchorRect) {
    return null;
  }

  const isPickerStep = step === 'picker' && !lockedMode;
  const panelMode = mode === 'existing' ? 'existing' : 'new';

  return (
    <QuickAddMenu
      allowAutoFocus={isPickerStep}
      anchorRect={anchorRect}
      canReturnToPicker={canReturnToPicker}
      form={
        <QuickAddMenuPanels
          assigneeId={draftAssigneeId}
          canCreateTask={
            draftTitle.trim().length > 0 &&
            !isSubmitting &&
            Boolean(effectiveQueueKey) &&
            (!requiresAssignee || Boolean(draftAssigneeId.trim()))
          }
          draftTitle={draftTitle}
          effectiveIssueType={effectiveIssueType}
          effectiveParentKey={effectiveParentKey}
          effectiveQueueKey={effectiveQueueKey}
          isSubmitting={isSubmitting}
          issueSearch={issueSearch}
          issueTypeOptions={issueTypeOptions}
          menuZIndex={SELECT_MENU_Z_INDEX}
          mode={panelMode}
          newTaskInputRef={newTaskInputRef}
          parentSelect={parentSelect}
          queueNamesByKey={queueNamesByKey}
          queueSelect={{
            handleQueueSearchQueryChange,
            isQueueSearching,
            queueSelectOptions,
            selectedQueueName,
          }}
          searchInputRef={searchInputRef}
          showAssigneeSelect={showAssigneeSelect}
          onAssigneeChange={(nextAssigneeId) => {
            setDraftAssigneeId(nextAssigneeId);
            onAssigneeChange?.(nextAssigneeId);
          }}
          onCreateTask={handleCreateTask}
          onIssueTypeChange={handleIssueTypeChange}
          onParentChange={handleParentChange}
          onQueueChange={handleQueueChange}
          onSelectExisting={onSelectExisting}
          onTitleChange={handleTaskTitleChange}
        />
      }
      formMode={mode}
      isPickerStep={isPickerStep}
      isSubmitting={isSubmitting}
      minWidth={resolveQuickAddPopoverMinWidth(isPickerStep)}
      pickerItems={pickerItems}
      showLoader={showLoader}
      variant="hosted"
      onBack={handleBackToPicker}
      onClose={handleRequestClose}
      onSelectMode={handleModeChange}
    />
  );
}
