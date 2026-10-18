'use client';

import { StickyNoteReactions } from '@/features/comments/components/StickyNoteReactions';
import { SwimlaneCommentDeleteButton } from '@/features/comments/components/SwimlaneCommentDeleteButton';
import { playStickyNoteExit } from '@/features/comments/utils/stickyNoteExit';

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
  showStickyNoteReactions,
  stickyNoteColor,
  swimlaneCommentId,
  taskId,
}: TaskBarAnnotationOverlaysProps) {
  return (
    <>
      {showStickyNoteReactions ? (
        <StickyNoteReactions
          hideAddTrigger={isResizing || readOnly}
          noteId={taskId}
          readOnly={readOnly}
          onTaskHoverClear={onTaskHover ? () => onTaskHover(null) : undefined}
        />
      ) : null}
      {showCommentDelete && swimlaneCommentId != null && !isDiagramCard && !isPhotoCard ? (
        <SwimlaneCommentDeleteButton
          color={stickyNoteColor}
          surface="sticky"
          tilt
          onDelete={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onCommentDelete?.(swimlaneCommentId);
          }}
        />
      ) : null}
      {showCommentDelete && swimlaneCommentId != null && (isDiagramCard || isPhotoCard) ? (
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
          tilt
          onDelete={(event) => {
            event.preventDefault();
            event.stopPropagation();
            playStickyNoteExit(taskId, () => {
              onDeleteLocalImage?.(taskId);
            });
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
