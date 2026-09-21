import {
  isStickyNoteCommentContentOverflowFlagSet,
  STICKY_NOTE_CONTENT_DATA_ATTR,
} from '@/features/comments/utils/stickyNoteCommentContentOverflow';
import {
  LINK_ARROW_DELETE_HANDLE_SELECTOR,
  isEventTargetInsideTask,
  isLinkDeleteHandleEventTarget,
} from '@/features/swimlane/utils/task-arrows/linkArrowDeleteHandleHelpers';
import {
  isTaskCardTitleOverflowFlagSet,
  TASK_CARD_TITLE_DATA_ATTR,
} from '@/features/task/components/TaskCard/components/taskCardContentHelpers';

import {
  shouldCollapseTaskBarLongHoverExpand,
  shouldHandleTaskBarClick,
  shouldStartLongHoverExpand,
} from './taskBarHelpers';

function isPointerStillOverTaskBar(taskId: string): boolean {
  if (typeof document === 'undefined') return false;
  const taskRoot = document.querySelector(`[data-task-id="${CSS.escape(taskId)}"]`);
  return taskRoot instanceof Element && taskRoot.matches(':hover');
}

function resolveCardLongHoverExpandAllowed(
  cardElement: HTMLElement | null | undefined,
  isCommentCard?: boolean
): boolean {
  const selector = isCommentCard
    ? `[${STICKY_NOTE_CONTENT_DATA_ATTR}]`
    : `[${TASK_CARD_TITLE_DATA_ATTR}]`;
  const contentRoot = cardElement?.querySelector(selector);
  const root = contentRoot instanceof HTMLElement ? contentRoot : null;
  return isCommentCard
    ? isStickyNoteCommentContentOverflowFlagSet(root)
    : isTaskCardTitleOverflowFlagSet(root);
}

function collapseTaskBarHoverExpand(input: {
  effectiveIsDragging: boolean;
  isContextMenuOpenForThis: boolean;
  isResizing: boolean;
  onTaskHover?: (taskId: string | null) => void;
  setIsExpandedByLongHover: React.Dispatch<React.SetStateAction<boolean>>;
}): void {
  if (
    shouldCollapseTaskBarLongHoverExpand({
      contextMenuOpenForThis: input.isContextMenuOpenForThis,
      isPointerOverCard: false,
    })
  ) {
    input.setIsExpandedByLongHover(false);
  }
  if (!input.effectiveIsDragging && !input.isResizing && input.onTaskHover) {
    input.onTaskHover(null);
  }
}

export function runTaskBarMouseEnter(input: {
  cardElementRef?: React.RefObject<HTMLElement | null>;
  effectiveIsDragging: boolean;
  isCommentCard?: boolean;
  isDraftTask: boolean;
  isLinking?: boolean;
  isNarrowForLongHoverExpand: boolean;
  isResizing: boolean;
  longHoverTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  onTaskHover?: (taskId: string | null) => void;
  setIsExpandedByLongHover: React.Dispatch<React.SetStateAction<boolean>>;
  taskId: string;
}): void {
  const allowLongHoverExpand = resolveCardLongHoverExpandAllowed(
    input.cardElementRef?.current,
    input.isCommentCard
  );
  if (
    allowLongHoverExpand &&
    shouldStartLongHoverExpand({
      effectiveIsDragging: input.effectiveIsDragging,
      isDraftTask: input.isDraftTask,
      isLinking: input.isLinking,
      isNarrowForLongHoverExpand: input.isNarrowForLongHoverExpand,
      isResizing: input.isResizing,
    })
  ) {
    if (input.longHoverTimeoutRef.current) {
      clearTimeout(input.longHoverTimeoutRef.current);
    }
    input.longHoverTimeoutRef.current = setTimeout(() => {
      input.setIsExpandedByLongHover(true);
    }, 1000);
  }
  if (!input.effectiveIsDragging && !input.isResizing && input.onTaskHover) {
    input.onTaskHover(input.taskId);
  }
}

export function buildTaskBarMouseEnterHandler(
  input: Parameters<typeof runTaskBarMouseEnter>[0]
): () => void {
  return () => {
    runTaskBarMouseEnter(input);
  };
}

export function buildTaskBarMouseLeaveHandler(input: {
  effectiveIsDragging: boolean;
  isContextMenuOpenForThis: boolean;
  isResizing: boolean;
  longHoverTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  onTaskHover?: (taskId: string | null) => void;
  setIsExpandedByLongHover: React.Dispatch<React.SetStateAction<boolean>>;
  taskId: string;
}): (e?: { relatedTarget: EventTarget | null }) => void {
  return (e) => {
    if (input.longHoverTimeoutRef.current) {
      clearTimeout(input.longHoverTimeoutRef.current);
      input.longHoverTimeoutRef.current = null;
    }
    const related = e?.relatedTarget ?? null;
    // Крестик удаления связи — вне task-bar; не сбрасываем hover, пока указатель на нём.
    if (isEventTargetInsideTask(related, input.taskId)) {
      return;
    }
    if (isLinkDeleteHandleEventTarget(related)) {
      return;
    }
    if (e != null && related == null) {
      requestAnimationFrame(() => {
        if (document.querySelector(`${LINK_ARROW_DELETE_HANDLE_SELECTOR}:hover`) != null) return;
        if (isPointerStillOverTaskBar(input.taskId)) return;
        collapseTaskBarHoverExpand(input);
      });
      return;
    }
    collapseTaskBarHoverExpand(input);
  };
}

export function buildTaskBarMouseUpHandler(input: {
  clickStartPos: { x: number; y: number } | null;
  effectiveIsDragging: boolean;
  isResizing: boolean;
  onClick?: (taskId: string) => void;
  setClickStartPos: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  shouldHandleClick?: (params: {
    clickStartPos: { x: number; y: number } | null;
    clientX: number;
    clientY: number;
    effectiveIsDragging: boolean;
    isResizing: boolean;
    target: HTMLElement;
  }) => boolean;
  taskId: string;
}): (e: React.MouseEvent) => void {
  return (e) => {
    const handleClick = input.shouldHandleClick ?? shouldHandleTaskBarClick;
    if (
      handleClick({
        clickStartPos: input.clickStartPos,
        clientX: e.clientX,
        clientY: e.clientY,
        effectiveIsDragging: input.effectiveIsDragging,
        isResizing: input.isResizing,
        target: e.target as HTMLElement,
      })
    ) {
      input.onClick?.(input.taskId);
    }
    input.setClickStartPos(null);
  };
}
