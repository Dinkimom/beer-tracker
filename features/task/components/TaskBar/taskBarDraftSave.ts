interface TaskBarDraftToolbarAction {
  disabled: boolean;
  showDisabledSave?: boolean;
  onCancel?: () => void;
  onSave: () => void;
}

function draftToolbarAction(
  disabled: boolean,
  onSave: () => void,
  onCancel?: () => void,
  showDisabledSave?: boolean
): TaskBarDraftToolbarAction {
  const action: TaskBarDraftToolbarAction = { disabled, onSave };
  if (onCancel) {
    action.onCancel = onCancel;
  }
  if (showDisabledSave) {
    action.showDisabledSave = true;
  }
  return action;
}

export function resolveTaskBarDraftSaveAction(input: {
  diagramDraft?: {
    isSubmitting: boolean;
    onCancel?: () => void;
    onSubmit: () => void;
  } | null;
  imageDraft?: {
    imageUrl?: string;
    isSubmitting: boolean;
    onCancel?: () => void;
    onSubmit: () => void;
  } | null;
  noteEditor?: {
    showDisabledSave?: boolean;
    value: string;
    onCancel?: () => void;
    onSubmit?: () => void;
  };
}): TaskBarDraftToolbarAction | null {
  const imageDraft = input.imageDraft;
  if (imageDraft) {
    return draftToolbarAction(
      imageDraft.isSubmitting || !imageDraft.imageUrl?.trim(),
      imageDraft.onSubmit,
      imageDraft.onCancel
    );
  }
  const diagramDraft = input.diagramDraft;
  if (diagramDraft) {
    return draftToolbarAction(
      diagramDraft.isSubmitting,
      diagramDraft.onSubmit,
      diagramDraft.onCancel
    );
  }
  const noteEditor = input.noteEditor;
  if (!noteEditor?.onSubmit) {
    return null;
  }
  return draftToolbarAction(
    !noteEditor.value.trim(),
    noteEditor.onSubmit,
    noteEditor.onCancel,
    noteEditor.showDisabledSave !== false
  );
}
