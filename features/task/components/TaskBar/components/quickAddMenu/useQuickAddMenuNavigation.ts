import type { QuickAddDraftKind, QuickAddMode } from './types';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { SwimlaneNoteClipboard } from '@/lib/comments/swimlaneNoteClipboard';

import { useCallback } from 'react';

import { quickAddModeToDraftKind, resolveQuickAddGhostText } from './quickAddMenuDraftState';
import { resolveQuickAddModeChange } from './quickAddMenuModes';

interface UseQuickAddMenuNavigationInput {
  availabilityStartDate?: string;
  draftCaption: string;
  draftComment: string;
  draftCommentColor: StickyNoteColor;
  draftDiagramName: string;
  draftTitle: string;
  imagesVisible: boolean;
  isSubmitting: boolean;
  lockedMode?: Exclude<QuickAddMode, 'existing'>;
  notesVisible: boolean;
  sprintPlannerUi: {
    noteClipboard: SwimlaneNoteClipboard | null;
    clearNoteEditPreview: () => void;
    setNoteEditPreview: (taskId: string, patch: { color?: StickyNoteColor; text?: string }) => void;
  };
  taskId: string;
  onCancel: () => void;
  onCommentColorChange: (color: StickyNoteColor) => void;
  onCreateAvailability?: (startDate?: string) => void;
  onDraftKindChange: (kind: QuickAddDraftKind | undefined) => void;
  onImageUrlChange: (url: string | undefined) => void;
  onPasteNote?: () => void;
  onTitleChange: (value: string) => void;
  setDraftImageUrl: (url: string | undefined) => void;
  setMode: (mode: QuickAddMode) => void;
  setStep: (step: 'form' | 'picker') => void;
}

export function useQuickAddMenuNavigation({
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
}: UseQuickAddMenuNavigationInput) {
  const handleModeChange = useCallback(
    (nextMode: QuickAddMode) => {
      const action = resolveQuickAddModeChange({
        canCreateAvailability: Boolean(onCreateAvailability),
        canPasteNote: Boolean(onPasteNote) && sprintPlannerUi.noteClipboard != null,
        imagesVisible,
        lockedMode,
        nextMode,
        notesVisible,
      });
      if (action === 'noop') {
        return;
      }
      if (action === 'availability') {
        onCreateAvailability?.(availabilityStartDate);
        return;
      }
      if (action === 'paste') {
        onPasteNote?.();
        return;
      }
      setMode(nextMode);
      setStep('form');
      onDraftKindChange(quickAddModeToDraftKind(nextMode));
      onTitleChange(
        resolveQuickAddGhostText(nextMode, {
          caption: draftCaption,
          comment: draftComment,
          diagramName: draftDiagramName,
          title: draftTitle,
        })
      );
      if (nextMode === 'comment' && taskId) {
        onCommentColorChange(draftCommentColor);
        sprintPlannerUi.setNoteEditPreview(taskId, {
          color: draftCommentColor,
          text: draftComment,
        });
        return;
      }
      sprintPlannerUi.clearNoteEditPreview();
    },
    [
      availabilityStartDate,
      draftCaption,
      draftComment,
      draftCommentColor,
      draftDiagramName,
      draftTitle,
      imagesVisible,
      lockedMode,
      notesVisible,
      onCommentColorChange,
      onCreateAvailability,
      onDraftKindChange,
      onPasteNote,
      onTitleChange,
      setMode,
      setStep,
      sprintPlannerUi,
      taskId,
    ]
  );

  const handleRequestClose = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    sprintPlannerUi.clearNoteEditPreview();
    onCancel();
  }, [isSubmitting, onCancel, sprintPlannerUi]);

  const handleBackToPicker = useCallback(() => {
    if (isSubmitting || lockedMode) {
      return;
    }
    sprintPlannerUi.clearNoteEditPreview();
    setDraftImageUrl(undefined);
    onImageUrlChange(undefined);
    onTitleChange('');
    onDraftKindChange(undefined);
    setStep('picker');
  }, [
    isSubmitting,
    lockedMode,
    onDraftKindChange,
    onImageUrlChange,
    onTitleChange,
    setDraftImageUrl,
    setStep,
    sprintPlannerUi,
  ]);

  return {
    handleBackToPicker,
    handleModeChange,
    handleRequestClose,
  };
}
