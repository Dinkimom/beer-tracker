export function resolveTaskBarAnnotationChrome(input: {
  effectiveIsDragging: boolean;
  inlineTitleEditor?: unknown;
  isDiagramCard?: boolean;
  isLinkingSession?: boolean;
  isPhotoCard: boolean;
  isResizing: boolean;
  isStickyNoteCard: boolean;
  quickAddMenu: unknown;
  quickAddSubmitting: boolean;
  swimlaneCommentId: string | null;
  hasCommentDelete: boolean;
  hasImageDelete: boolean;
  isLocalTask?: boolean;
  presenceLocked?: boolean;
}): {
  showCommentDelete: boolean;
  showDraftNoteDelete: boolean;
  showImageDelete: boolean;
  showStickyNotePin: boolean;
  showStickyNoteReactions: boolean;
} {
  const chromeIdle =
    !input.effectiveIsDragging && !input.isResizing && !input.quickAddSubmitting;
  const chromeMutable = chromeIdle && !input.presenceLocked && !input.isLinkingSession;
  const chromeOverlay = Boolean(input.quickAddMenu) || Boolean(input.inlineTitleEditor);
  const showSavedAnnotationReactions =
    input.swimlaneCommentId != null &&
    (input.isStickyNoteCard || input.isPhotoCard || input.isDiagramCard === true);
  return {
    showCommentDelete:
      input.swimlaneCommentId != null &&
      input.hasCommentDelete &&
      chromeMutable &&
      !chromeOverlay,
    showDraftNoteDelete:
      input.isStickyNoteCard &&
      input.isLocalTask === true &&
      input.swimlaneCommentId == null &&
      input.hasImageDelete &&
      chromeMutable &&
      !chromeOverlay,
    showImageDelete:
      ((input.isPhotoCard && input.isLocalTask !== true) ||
        (input.isDiagramCard === true && input.isLocalTask === true)) &&
      input.swimlaneCommentId == null &&
      input.hasImageDelete &&
      chromeMutable &&
      !chromeOverlay,
    showStickyNotePin: input.isStickyNoteCard && !input.effectiveIsDragging && !input.quickAddSubmitting,
    showStickyNoteReactions:
      showSavedAnnotationReactions && chromeIdle && !chromeOverlay && !input.isLinkingSession,
  };
}

export function resolveTaskBarCardClick(input: {
  imageUrl?: string;
  isDiagramCard: boolean;
  isLinkingSession?: boolean;
  isLocalTask?: boolean;
  isPhotoCard: boolean;
  onClick?: (taskId: string) => void;
  openDiagram?: () => void;
  openLightbox: () => void;
}): ((taskId: string) => void) | undefined {
  if (input.isLinkingSession) {
    return input.onClick;
  }
  if (input.isPhotoCard && input.imageUrl && input.isLocalTask !== true) {
    return () => input.openLightbox();
  }
  if (input.isDiagramCard && input.isLocalTask !== true) {
    return input.openDiagram;
  }
  return input.onClick;
}

export function resolveDiagramNameChangeHandler(input: {
  commentId: string | null;
  isDiagramCard: boolean;
  onCommentUpdate?: (commentId: string, text: string) => void;
  presenceBlocksMutations: boolean;
}): ((name: string) => void) | undefined {
  if (
    !input.isDiagramCard ||
    input.presenceBlocksMutations ||
    input.commentId == null ||
    input.onCommentUpdate == null
  ) {
    return undefined;
  }
  const commentId = input.commentId;
  const onCommentUpdate = input.onCommentUpdate;
  return (nextName: string) => {
    onCommentUpdate(commentId, nextName.trim());
  };
}

export function getTaskBarRootClassName(input: {
  effectiveIsDragging: boolean;
  instantGeometryClass: string;
  interactionDisabled: boolean;
  isAnnotationCard: boolean;
  linkCursorClass: string;
  shouldExpandByLongHover: boolean;
}): string {
  const groupClass = input.isAnnotationCard ? 'group ' : '';
  const expandClass = input.shouldExpandByLongHover ? 'task-bar-expanded' : '';
  if (input.interactionDisabled || input.effectiveIsDragging) {
    return `task-bar-item absolute ${input.instantGeometryClass} ${groupClass}${expandClass} pointer-events-none ${input.linkCursorClass}`;
  }
  return `task-bar-item absolute ${input.instantGeometryClass} ${groupClass}${expandClass} pointer-events-auto ${input.linkCursorClass}`;
}
