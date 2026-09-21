'use client';

import { StickyNoteReactions } from '@/features/comments/components/StickyNoteReactions';
import { SwimlaneCommentDeleteButton } from '@/features/comments/components/SwimlaneCommentDeleteButton';
import { SwimlaneStickyNotePin } from '@/features/comments/components/SwimlaneStickyNotePin';

function resolveAnnotationDeleteSurface(
  isDiagramCard: boolean,
  isPhotoCard: boolean
): 'diagram' | 'photo' | 'sticky' {
  if (isDiagramCard) {
    return 'diagram';
  }
  if (isPhotoCard) {
    return 'photo';
  }
  return 'sticky';
}

interface TaskBarAnnotationOverlaysProps {
  isDiagramCard?: boolean;
  isPhotoCard?: boolean;
  isResizing: boolean;
  readOnly?: boolean;
  showCommentDelete: boolean;
  showDraftNoteDelete?: boolean;
  showImageDelete: boolean;
  showStickyNotePin: boolean;
  showStickyNoteReactions: boolean;
  stickyNoteColor?: string | null;
  swimlaneCommentId: string | null;
  taskId: string;
  onCommentDelete?: (commentId: string) => void;
  onDeleteLocalImage?: (taskId: string) => void;
  onTaskHover?: (taskId: string | null) => void;
}

export function TaskBarAnnotationOverlays({
  isDiagramCard = false,
  isPhotoCard = false,
  isResizing,
  onCommentDelete,
  onDeleteLocalImage,
  onTaskHover,
  readOnly = false,
  showCommentDelete,
  showDraftNoteDelete = false,
  showImageDelete,
  showStickyNotePin,
  showStickyNoteReactions,
  stickyNoteColor,
  swimlaneCommentId,
  taskId,
}: TaskBarAnnotationOverlaysProps) {
  return (
    <>
      {showStickyNotePin ? <SwimlaneStickyNotePin color={stickyNoteColor} /> : null}
      {showStickyNoteReactions ? (
        <StickyNoteReactions
          hideAddTrigger={isResizing || readOnly}
          noteId={taskId}
          readOnly={readOnly}
          onTaskHoverClear={onTaskHover ? () => onTaskHover(null) : undefined}
        />
      ) : null}
      {showCommentDelete && swimlaneCommentId != null ? (
        <SwimlaneCommentDeleteButton
          color={stickyNoteColor}
          surface={resolveAnnotationDeleteSurface(isDiagramCard, isPhotoCard)}
          onDelete={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onCommentDelete?.(swimlaneCommentId);
          }}
        />
      ) : null}
      {showDraftNoteDelete ? (
        <SwimlaneCommentDeleteButton
          color={stickyNoteColor}
          surface="sticky"
          onDelete={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDeleteLocalImage?.(taskId);
          }}
        />
      ) : null}
      {showImageDelete ? (
        <SwimlaneCommentDeleteButton
          surface={resolveAnnotationDeleteSurface(isDiagramCard, isPhotoCard)}
          onDelete={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDeleteLocalImage?.(taskId);
          }}
        />
      ) : null}
    </>
  );
}
