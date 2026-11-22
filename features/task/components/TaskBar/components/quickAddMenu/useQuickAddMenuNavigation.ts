import type { QuickAddDraftTextFields } from './quickAddMenuDraftState';
import type { QuickAddMenuActions, QuickAddMode } from './types';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { SwimlaneNoteClipboard } from '@/lib/comments/swimlaneNoteClipboard';

import { useCallback } from 'react';

import { quickAddModeToDraftKind, resolveQuickAddGhostText } from './quickAddMenuDraftState';
import { resolveQuickAddModeChange } from './quickAddMenuModes';

interface UseQuickAddMenuNavigationInput {
  /** Действия меню, привязанные к черновику: отмена, вид, заголовок, цвет, фото, вставка, отсутствие. */
  actions: Pick<
    QuickAddMenuActions,
    | 'onCancel'
    | 'onCommentColorChange'
    | 'onCreateAvailability'
    | 'onDraftKindChange'
    | 'onImageUrlChange'
    | 'onPasteNote'
    | 'onTitleChange'
  >;
  availabilityStartDate?: string;
  draftCommentColor: StickyNoteColor;
  /** Введённое в каждом виде — подставляется в карточку при смене вида. */
  draftTexts: QuickAddDraftTextFields;
  imagesVisible: boolean;
  isSubmitting: boolean;
  lockedMode?: Exclude<QuickAddMode, 'existing'>;
  notesVisible: boolean;
  objectStorageConfigured?: boolean;
  taskId: string;
  tools: {
    noteClipboard: SwimlaneNoteClipboard | null;
    clearNoteEditPreview: () => void;
    setNoteEditPreview: (taskId: string, patch: { color?: StickyNoteColor; text?: string }) => void;
  };
  setDraftImageUrl: (url: string | undefined) => void;
  setMode: (mode: QuickAddMode) => void;
  setStep: (step: 'form' | 'picker') => void;
}

export function useQuickAddMenuNavigation({
  actions,
  availabilityStartDate,
  draftCommentColor,
  draftTexts,
  imagesVisible,
  isSubmitting,
  lockedMode,
  notesVisible,
  objectStorageConfigured = true,
  setDraftImageUrl,
  setMode,
  setStep,
  tools,
  taskId,
}: UseQuickAddMenuNavigationInput) {
  const {
    onCancel,
    onCommentColorChange,
    onCreateAvailability,
    onDraftKindChange,
    onImageUrlChange,
    onPasteNote,
    onTitleChange,
  } = actions;
  const { caption: draftCaption, comment: draftComment, diagramName: draftDiagramName, title: draftTitle } =
    draftTexts;
  const handleModeChange = useCallback(
    (nextMode: QuickAddMode) => {
      const action = resolveQuickAddModeChange({
        canCreateAvailability: Boolean(onCreateAvailability),
        canPasteNote: Boolean(onPasteNote) && tools.noteClipboard != null,
        imagesVisible,
        lockedMode,
        nextMode,
        notesVisible,
        objectStorageConfigured,
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
        tools.setNoteEditPreview(taskId, {
          color: draftCommentColor,
          text: draftComment,
        });
        return;
      }
      tools.clearNoteEditPreview();
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
      objectStorageConfigured,
      onCommentColorChange,
      onCreateAvailability,
      onDraftKindChange,
      onPasteNote,
      onTitleChange,
      setMode,
      setStep,
      tools,
      taskId,
    ]
  );

  const handleRequestClose = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    tools.clearNoteEditPreview();
    onCancel();
  }, [isSubmitting, onCancel, tools]);

  const handleBackToPicker = useCallback(() => {
    if (isSubmitting || lockedMode) {
      return;
    }
    tools.clearNoteEditPreview();
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
    tools,
  ]);

  return {
    handleBackToPicker,
    handleModeChange,
    handleRequestClose,
  };
}
