'use client';

import type { QuickAddMode, SwimlaneQuickAddMenuProps } from './types';

import { observer } from 'mobx-react-lite';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useObjectStorageConfigured } from '@/contexts/ObjectStorageConfiguredContext';
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
import { QuickAddMenuExistingPanel } from './QuickAddMenuExistingPanel';
import {
  buildQuickAddRootPickerItems,
  filterQuickAddVisibleModes,
  shouldOpenQuickAddKindPicker,
  shouldShowQuickAddBootstrapLoader,
} from './quickAddMenuModes';
import { QuickAddMenuNewPanel } from './QuickAddMenuNewPanel';
import { useQuickAddMenuNavigation } from './useQuickAddMenuNavigation';


function resolveQuickAddPopoverMinWidth(isPickerStep: boolean): number | undefined {
  if (isPickerStep) {
    return QUICK_ADD_KIND_PICKER_WIDTH_PX;
  }
  return undefined;
}

export const SwimlaneQuickAddMenu = observer(function SwimlaneQuickAddMenu({
  actions,
  anchorId,
  draft,
  isSubmitting,
  options,
}: SwimlaneQuickAddMenuProps) {
  const {
    assigneeId,
    availabilityStartDate,
    commentColor,
    draftKind,
    imageUrl,
    issueType,
    parentKey,
    queueKey,
    taskId,
    title,
  } = draft;
  const {
    boardId,
    excludedIssueKeys,
    lockedMode,
    parentSelectOptions,
    queueOptions,
    requiresAssignee = false,
    showAssigneeSelect = false,
  } = options;
  const { onAssigneeChange, onCreate, onIssueTypeChange, onParentChange, onQueueChange, onSelectExisting, onTitleChange } =
    actions;
  const sprintPlannerUi = useRootStore().sprintPlannerUi;
  const objectStorageConfigured = useObjectStorageConfigured();
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
  const { caption: draftCaption, comment: draftComment, diagramName: draftDiagramName } = initialDraft;
  const draftTexts = useMemo(
    () => ({ caption: draftCaption, comment: draftComment, diagramName: draftDiagramName, title: draftTitle }),
    [draftCaption, draftComment, draftDiagramName, draftTitle]
  );
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

  const queueSelect = useQuickAddQueueSelect({
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
    actions,
    availabilityStartDate,
    draftCommentColor,
    draftTexts,
    imagesVisible,
    isSubmitting,
    lockedMode,
    notesVisible,
    objectStorageConfigured,
    setDraftImageUrl,
    setMode,
    setStep,
    taskId,
    tools: sprintPlannerUi.tools,
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
        panelMode === 'existing' ? (
          <QuickAddMenuExistingPanel
            isSubmitting={isSubmitting}
            issueSearch={issueSearch}
            searchInputRef={searchInputRef}
            onSelectExisting={onSelectExisting}
          />
        ) : (
          <QuickAddMenuNewPanel
            assigneeId={draftAssigneeId}
            canCreate={
              draftTitle.trim().length > 0 &&
              !isSubmitting &&
              Boolean(effectiveQueueKey) &&
              (!requiresAssignee || Boolean(draftAssigneeId.trim()))
            }
            isSubmitting={isSubmitting}
            issueType={effectiveIssueType}
            issueTypeOptions={issueTypeOptions}
            parentKey={effectiveParentKey}
            parentSelect={parentSelect}
            queueKey={effectiveQueueKey}
            queueNamesByKey={queueNamesByKey}
            queueSelect={queueSelect}
            showAssigneeSelect={showAssigneeSelect}
            textareaRef={newTaskInputRef}
            title={draftTitle}
            onAssigneeChange={(nextAssigneeId) => {
              setDraftAssigneeId(nextAssigneeId);
              onAssigneeChange?.(nextAssigneeId);
            }}
            onCreate={handleCreateTask}
            onIssueTypeChange={handleIssueTypeChange}
            onParentChange={handleParentChange}
            onQueueChange={handleQueueChange}
            onTitleChange={handleTaskTitleChange}
          />
        )
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
});
