import type { SwimlaneQuickAddMenuProps } from './components/SwimlaneQuickAddMenu';
import type { TaskResizeParams } from '@/features/task/hooks/useTaskResize';
import type { Task, Developer, TaskPosition } from '@/types';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import omit from 'lodash-es/omit';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { isSwimlaneCommentTask, isSwimlaneDiagramTask } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { SWIMLANE_TASK_DRAG_DATA_KIND } from '@/features/swimlane/utils/swimlaneDragIds';
import { useSprintCardPresenceLocked } from '@/features/task/components/TaskCard/SprintCardPresenceContext';
import { useStickyNoteVerticalResize } from '@/features/task/hooks/useStickyNoteVerticalResize';
import { useTaskBarResize } from '@/features/task/hooks/useTaskBarResize';
import {
  type StickyNoteCardRowLayout,
} from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import { isSwimlaneImageTask } from '@/features/task/utils/swimlaneImageTask';
import { isEffectivelyQaTask } from '@/features/task/utils/taskUtils';
import { plannerCommentCardRowHeightFromDurationParts } from '@/lib/comments/plannerCommentCardRow';
import { useRootStore } from '@/lib/layers';
import { sprintCardPresenceBlocksNewGestures } from '@/lib/realtime/sprintCardPresence';
import { getPreviewBorderColor, resolvePaletteStatusKey } from '@/utils/statusColors';

import {
  buildTaskBarLayoutStyle,
  buildTaskBarWidthCss,
  isDimmedByContextMenuElsewhere,
  resolveHasQaTaskInSwimlane,
  resolveTaskBarContentLayout,
  resolveTaskBarDisplayDimensions,
  resolveTaskBarDragActivationProps,
  resolveTaskBarEffectiveOpacity,
  resolveTaskBarInstantGeometryClass,
  resolveTaskBarLongHoverExpand,
  resolveTaskBarZIndex,
} from './taskBarHelpers';

function publishTaskBarResizePreview(
  sprintPlannerUi: {
    clearStickyNoteCardRowPreview: () => void;
    clearTaskResizePreview: () => void;
    setStickyNoteCardRowPreview: (preview: {
      layerShiftUp: number;
      span: number;
      taskId: string;
    } | null) => void;
    setTaskResizePreview: (preview: {
      duration: number;
      startCell: number | null;
      taskId: string;
    } | null) => void;
  },
  taskId: string,
  pairsHeightWithDuration: boolean,
  preview: { duration: number; startCell: number | null } | null
): void {
  if (preview == null) {
    sprintPlannerUi.clearTaskResizePreview();
    if (pairsHeightWithDuration) {
      sprintPlannerUi.clearStickyNoteCardRowPreview();
    }
    return;
  }
  sprintPlannerUi.setTaskResizePreview({ ...preview, taskId });
  if (pairsHeightWithDuration) {
    sprintPlannerUi.setStickyNoteCardRowPreview({
      layerShiftUp: 0,
      span: plannerCommentCardRowHeightFromDurationParts(preview.duration),
      taskId,
    });
  }
}

export function useTaskBarDisplayState(input: {
  assigneeName?: string;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  customStyle?: React.CSSProperties;
  developers?: Developer[];
  disableResize?: boolean;
  draggableId: string;
  duration: number;
  globalNameFilter?: string;
  inlineTitleEditor?: {
    onChange: (value: string) => void;
    onSubmit?: () => void;
    value: string;
  };
  interactionDisabled?: boolean;
  isExpandedByLongHover: boolean;
  isInError?: boolean;
  isLinking?: boolean;
  isSelected?: boolean;
  leftPercent: number;
  onResize: (params: TaskResizeParams) => void;
  qaTasksMap?: Map<string, Task>;
  quickAddMenu?: Omit<SwimlaneQuickAddMenuProps, 'anchorId' | 'isSubmitting' | 'title'> & {
    title: string;
  };
  swimlaneBarDurationParts?: number;
  swimlaneDragActive?: boolean;
  stickyNoteCardRowResize?: {
    assignedTaskLayer: number;
    committedCardRowLayout?: StickyNoteCardRowLayout;
    hasTaskOverlaps: boolean;
    layerHeight: number;
    onLayoutCommit?: (layout: StickyNoteCardRowLayout) => void;
    taskBandTotalHeight: number;
  };
  swimlaneTimelineTotalParts: number;
  task: Task;
  taskPositions?: Map<string, TaskPosition>;
  widthPercent: number;
}) {
  const { sprintPlannerUi } = useRootStore();
  const taskId = input.task.id;
  const presenceLocked = useSprintCardPresenceLocked(taskId);
  const [ownDragActive, setOwnDragActive] = useState(false);
  const isStickyNoteCard =
    !isSwimlaneImageTask(input.task) &&
    !isSwimlaneDiagramTask(input.task) &&
    isSwimlaneCommentTask(input.task);
  const isSwimlanePhotoCard = isSwimlaneImageTask(input.task);
  const isPhotoOrDiagramCard = isSwimlanePhotoCard || isSwimlaneDiagramTask(input.task);
  const handleResizeSessionChange = useCallback(
    (active: boolean) => {
      sprintPlannerUi.setResizingTaskId(active ? taskId : null);
    },
    [sprintPlannerUi, taskId]
  );
  const pairsHeightWithDuration = isSwimlaneDiagramTask(input.task);
  const handleResizePreview = useCallback(
    (preview: { duration: number; startCell: number | null } | null) => {
      publishTaskBarResizePreview(sprintPlannerUi, taskId, pairsHeightWithDuration, preview);
    },
    [pairsHeightWithDuration, sprintPlannerUi, taskId]
  );
  const resize = useTaskBarResize({
    duration: input.duration,
    onResize: input.onResize,
    onResizePreview: handleResizePreview,
    onResizeSessionChange: handleResizeSessionChange,
    timelineTotalCells: input.swimlaneTimelineTotalParts,
  });
  const supportsCardRowVerticalResize =
    (isStickyNoteCard || isSwimlanePhotoCard) && input.stickyNoteCardRowResize != null;
  const verticalResize = useStickyNoteVerticalResize({
    assignedTaskLayer: input.stickyNoteCardRowResize?.assignedTaskLayer ?? 0,
    committedCardRowLayout: input.stickyNoteCardRowResize?.committedCardRowLayout,
    enabled:
      supportsCardRowVerticalResize &&
      !input.disableResize,
    hasTaskOverlaps: input.stickyNoteCardRowResize?.hasTaskOverlaps ?? false,
    layerHeight: input.stickyNoteCardRowResize?.layerHeight ?? 1,
    onResizeSessionChange: handleResizeSessionChange,
    onLayoutCommit: input.stickyNoteCardRowResize?.onLayoutCommit,
    taskBandTotalHeight: input.stickyNoteCardRowResize?.taskBandTotalHeight ?? 1,
    taskId,
  });
  const isAnyResizing = resize.isResizing || verticalResize.isResizing;

  useEffect(() => {
    return () => {
      if (sprintPlannerUi.resizingTaskId === taskId) {
        sprintPlannerUi.setResizingTaskId(null);
      }
    };
  }, [sprintPlannerUi, taskId]);

  const presenceBlocksDrag = sprintCardPresenceBlocksNewGestures(presenceLocked, ownDragActive);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: input.draggableId,
    disabled: input.interactionDisabled || presenceBlocksDrag,
    data: { kind: SWIMLANE_TASK_DRAG_DATA_KIND },
  });

  useEffect(() => {
    setOwnDragActive(isDragging);
  }, [isDragging]);

  const effectiveIsDragging =
    input.swimlaneDragActive === undefined ? isDragging : isDragging && input.swimlaneDragActive;

  const dragActivationProps = useMemo(
    () =>
      resolveTaskBarDragActivationProps({
        attributes,
        inlineTitleEditor: input.inlineTitleEditor,
        interactionDisabled:
          (input.interactionDisabled ?? false) ||
          sprintCardPresenceBlocksNewGestures(presenceLocked, isDragging),
        isResizing: isAnyResizing,
        listeners,
      }),
    [attributes, input.inlineTitleEditor, input.interactionDisabled, isAnyResizing, isDragging, listeners, presenceLocked]
  );

  const usesPlannerDragOverlay = input.swimlaneDragActive !== undefined;
  const hideSourceForOverlay = usesPlannerDragOverlay && effectiveIsDragging;

  const { displayLeftPercent, displayWidthPercent } = resolveTaskBarDisplayDimensions({
    isResizing: resize.isResizing,
    leftPercent: input.leftPercent,
    resizePreviewDuration: resize.resizePreviewDuration,
    resizePreviewStartCell: resize.resizePreviewStartCell,
    swimlaneTimelineTotalParts: input.swimlaneTimelineTotalParts,
    widthPercent: input.widthPercent,
  });

  const isDraftTask = input.task.isLocalTask === true;
  const isPhotoCard = isPhotoOrDiagramCard;
  const { expandedMinWidthPercent, isNarrowForLongHoverExpand, shouldExpandByLongHover } =
    resolveTaskBarLongHoverExpand({
      duration: input.duration,
      effectiveIsDragging,
      isDraftTask,
      isExpandedByLongHover: input.isExpandedByLongHover,
      isLinking: input.isLinking,
      isPhotoCard,
      isResizing: isAnyResizing,
      swimlaneBarDurationParts: input.swimlaneBarDurationParts,
      swimlaneTimelineTotalParts: input.swimlaneTimelineTotalParts,
    });

  const { baseWidthCss, expandedWidthCss } = buildTaskBarWidthCss(
    displayWidthPercent,
    expandedMinWidthPercent
  );
  const barDurationParts = input.swimlaneBarDurationParts ?? input.duration;
  const { contentDurationParts, contentWidthPercent } = resolveTaskBarContentLayout({
    displayWidthPercent,
    durationParts: barDurationParts,
    expandedMinWidthPercent,
    shouldExpandByLongHover,
  });

  const customStyleLayout = omit(input.customStyle ?? {}, ['opacity', 'transition']);
  const layoutStyle = buildTaskBarLayoutStyle({
    baseWidthCss,
    customStyleLayout,
    displayLeftPercent,
    expandedWidthCss,
    hideSourceForOverlay,
    shouldExpandByLongHover,
    transformCss: hideSourceForOverlay ? undefined : CSS.Translate.toString(transform),
  });

  const isQATask = isEffectivelyQaTask(input.task);
  const hasQATaskInSwimlane = resolveHasQaTaskInSwimlane({
    isQATask,
    qaTasksMap: input.qaTasksMap,
    task: input.task,
    taskPositions: input.taskPositions,
  });

  const previewBorder = getPreviewBorderColor(
    resolvePaletteStatusKey(input.task.originalStatus, input.task.statusColorKey),
    isQATask
  );

  const effectiveOpacity = resolveTaskBarEffectiveOpacity({
    contextMenuBlurOtherCards: input.contextMenuBlurOtherCards ?? false,
    contextMenuTaskId: input.contextMenuTaskId ?? null,
    customStyleOpacity:
      typeof input.customStyle?.opacity === 'number' ? input.customStyle.opacity : undefined,
    globalNameFilter: input.globalNameFilter,
    task: input.task,
  });

  const dimmedByContextMenuElsewhere = isDimmedByContextMenuElsewhere({
    contextMenuBlurOtherCards: input.contextMenuBlurOtherCards ?? false,
    contextMenuTaskId: input.contextMenuTaskId ?? null,
    taskId: input.task.id,
  });

  const taskBarZIndex = resolveTaskBarZIndex({
    effectiveIsDragging,
    inlineTitleEditor: input.inlineTitleEditor,
    isInError: input.isInError ?? false,
    isPhotoCard,
    isStickyNote: isSwimlaneCommentTask(input.task),
    quickAddMenu: input.quickAddMenu,
    shouldExpandByLongHover,
  });

  const instantGeometryClass = resolveTaskBarInstantGeometryClass({
    hideSourceForOverlay,
    isResizing: isAnyResizing,
  });

  return {
    contentDurationParts,
    contentWidthPercent,
    dimmedByContextMenuElsewhere,
    dragActivationProps,
    effectiveIsDragging,
    effectiveOpacity,
    hasQATaskInSwimlane,
    hideSourceForOverlay,
    instantGeometryClass,
    isAnyResizing,
    isDraftTask,
    isNarrowForLongHoverExpand,
    isQATask,
    isStickyNoteCard,
    layoutStyle,
    presenceLocked,
    previewBorder,
    resize,
    setNodeRef,
    shouldExpandByLongHover,
    taskBarZIndex,
    transform,
    verticalResize,
  };
}
