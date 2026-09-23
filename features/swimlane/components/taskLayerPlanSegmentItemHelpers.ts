import type { TaskLayerPositionedTaskItemProps } from './TaskLayer.types';
import type { SprintPlannerNoteComposerState, SprintPlannerNoteEditPreview } from '@/lib/layers';
import type { PhaseSegment, Task } from '@/types';

import { getPartsPerDay } from '@/constants';
import { parseSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import {
  getLeftPercentForSegmentStartCell,
  getWidthPercent,
} from '@/features/swimlane/utils/positionUtils';
import { swimlaneTaskDraggableId } from '@/features/swimlane/utils/swimlaneDragIds';
import { getSwimlanePlanSegmentHtmlAnchorId } from '@/features/swimlane/utils/task-arrows/swimlaneSegmentArrowHelpers';
import { isPlannerAnnotationTask } from '@/features/task/utils/swimlaneImageTask';
import { parseStickyNoteColor, type StickyNoteColor } from '@/lib/comments/stickyNoteColor';

function isQuickAddDraftTask(task: Task): boolean {
  return task.isLocalTask === true && parseSwimlaneCommentTaskId(task.id) == null;
}

export function isInlineNoteCreateDraft(
  task: Task,
  noteComposer?: SprintPlannerNoteComposerState | null
): boolean {
  return (
    task.isLocalTask === true &&
    task.localDraftKind === 'comment' &&
    noteComposer?.taskId !== task.id
  );
}

export function isInlineNoteEdit(
  task: Task,
  noteComposer?: SprintPlannerNoteComposerState | null
): boolean {
  return noteComposer?.mode === 'comment' && noteComposer.taskId === task.id;
}

export function isInlineImageCreateDraft(task: Task): boolean {
  return task.isLocalTask === true && task.localDraftKind === 'image';
}

export function isInlineDiagramCreateDraft(task: Task): boolean {
  return task.isLocalTask === true && task.localDraftKind === 'diagram';
}

/** Схема держит квадрат по duration; независимая полоса строк нужна только заметке и фото. */
export function usesIndependentSwimlaneCardRowBand(input: {
  hasCardRowOverride: boolean;
  isDiagramCard: boolean;
  isPhotoCard: boolean;
  isStickyNoteCard: boolean;
}): boolean {
  if (input.isDiagramCard) {
    return false;
  }
  return input.isStickyNoteCard || input.isPhotoCard || input.hasCardRowOverride;
}

export function buildInlineImageDraftEditor(input: {
  caption: string;
  imageUrl?: string;
  isSubmitting: boolean;
  taskId: string;
  onCancel: (taskId: string) => void;
  onCaptionChange: (taskId: string, title: string) => void;
  onImageUrlChange: (taskId: string, url: string | undefined) => void;
  onSubmit: (taskId: string, caption: string, imageUrl: string) => void;
}): {
  caption: string;
  imageUrl?: string;
  isSubmitting: boolean;
  taskId: string;
  onCancel: () => void;
  onCaptionChange: (value: string) => void;
  onImageUrlChange: (url: string | undefined) => void;
  onSubmit: () => void;
} {
  return {
    caption: input.caption,
    imageUrl: input.imageUrl,
    isSubmitting: input.isSubmitting,
    taskId: input.taskId,
    onCancel: () => input.onCancel(input.taskId),
    onCaptionChange: (value) => input.onCaptionChange(input.taskId, value),
    onImageUrlChange: (url) => input.onImageUrlChange(input.taskId, url),
    onSubmit: () => {
      const imageUrl = input.imageUrl?.trim();
      if (!imageUrl) {
        return;
      }
      input.onSubmit(input.taskId, input.caption, imageUrl);
    },
  };
}

export function buildInlineDiagramDraftEditor(input: {
  caption: string;
  isSubmitting: boolean;
  taskId: string;
  onCancel: (taskId: string) => void;
  onCaptionChange: (taskId: string, title: string) => void;
  onSubmit: (taskId: string, name?: string) => void;
}): {
  caption: string;
  isSubmitting: boolean;
  taskId: string;
  onCancel: () => void;
  onCaptionChange: (value: string) => void;
  onSubmit: () => void;
} {
  return {
    caption: input.caption,
    isSubmitting: input.isSubmitting,
    taskId: input.taskId,
    onCancel: () => input.onCancel(input.taskId),
    onCaptionChange: (value) => input.onCaptionChange(input.taskId, value),
    onSubmit: () => input.onSubmit(input.taskId, input.caption),
  };
}

export function buildInlineNoteDraftEditor(input: {
  color?: StickyNoteColor | string | null;
  placeholder: string;
  taskId: string;
  text: string;
  onCancel: (taskId: string) => void;
  onChange: (taskId: string, title: string) => void;
  onColorChange?: (taskId: string, color: StickyNoteColor) => void;
  onSubmit: (taskId: string, title: string, color: StickyNoteColor) => void;
}): {
  color?: StickyNoteColor;
  placeholder: string;
  showDisabledSave: boolean;
  value: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onColorChange?: (color: StickyNoteColor) => void;
  onSubmit: () => void;
} {
  const color = parseStickyNoteColor(input.color);
  const onColorChange = input.onColorChange;
  return {
    color: onColorChange ? color : undefined,
    placeholder: input.placeholder,
    showDisabledSave: true,
    value: input.text,
    onCancel: () => input.onCancel(input.taskId),
    onChange: (value) => input.onChange(input.taskId, value),
    onColorChange: onColorChange
      ? (nextColor) => onColorChange(input.taskId, nextColor)
      : undefined,
    onSubmit: () => {
      if (!input.text.trim()) {
        return;
      }
      input.onSubmit(input.taskId, input.text, color);
    },
  };
}

export function resolvePlanSegmentInlineNoteEditor(input: {
  displayColor?: StickyNoteColor | string | null;
  displayText: string;
  isCreateDraft: boolean;
  isEdit: boolean;
  placeholder: string;
  taskId: string;
  toolColor: StickyNoteColor;
  closeNoteComposer: () => void;
  onCancelDraft?: (taskId: string) => void;
  onCreateColorChange?: (taskId: string, color: StickyNoteColor) => void;
  onCreateTextChange?: (taskId: string, title: string) => void;
  onEditColorChange: (taskId: string, color: StickyNoteColor) => void;
  onEditTextChange: (taskId: string, title: string) => void;
  onSubmit?: (taskId: string, title: string, color: StickyNoteColor) => void;
}): ReturnType<typeof buildInlineNoteDraftEditor> | undefined {
  if (!input.isEdit && !input.isCreateDraft) {
    return undefined;
  }
  const onSubmit = input.onSubmit;
  if (!onSubmit) {
    return undefined;
  }
  if (input.isEdit) {
    return buildInlineNoteDraftEditor({
      color: input.displayColor,
      placeholder: input.placeholder,
      taskId: input.taskId,
      text: input.displayText,
      onCancel: (taskId) => {
        if (input.onCancelDraft) {
          input.onCancelDraft(taskId);
          return;
        }
        input.closeNoteComposer();
      },
      onChange: input.onEditTextChange,
      onColorChange: input.onEditColorChange,
      onSubmit,
    });
  }
  if (!input.onCancelDraft || !input.onCreateTextChange) {
    return undefined;
  }
  return buildInlineNoteDraftEditor({
    color: input.displayColor ?? input.toolColor,
    placeholder: input.placeholder,
    taskId: input.taskId,
    text: input.displayText,
    onCancel: input.onCancelDraft,
    onChange: input.onCreateTextChange,
    onColorChange: input.onCreateColorChange,
    onSubmit,
  });
}

export function resolveTaskWithNoteEditPreview(
  task: Task,
  preview: SprintPlannerNoteEditPreview | null | undefined
): Task {
  if (preview?.taskId !== task.id) {
    return task;
  }
  const next: Task = { ...task };
  if (preview.color !== undefined) {
    next.stickyNoteColor = preview.color;
  }
  if (preview.text !== undefined) {
    next.name = preview.text;
  }
  return next;
}

function computePlanSegmentGeometry(input: {
  hasMultiplePlanSegments: boolean;
  seg: PhaseSegment;
  segIdx: number;
  taskId: string;
  timelineTotalParts: number;
}) {
  const startCell = input.seg.startDay * getPartsPerDay() + input.seg.startPart;
  const draggableId = input.hasMultiplePlanSegments
    ? swimlaneTaskDraggableId(input.taskId, input.segIdx)
    : input.taskId;
  return {
    draggableId,
    htmlAnchorId: getSwimlanePlanSegmentHtmlAnchorId(input.taskId, input.segIdx),
    leftPercent: getLeftPercentForSegmentStartCell(startCell, input.timelineTotalParts),
    widthPercent: getWidthPercent(input.seg.duration, input.timelineTotalParts),
  };
}

function computePlanSegmentVisualState(input: {
  activeDraggableId: string | null;
  cardOpacity: number;
  draggableId: string;
  hasQuickAddDraftMode: boolean;
  hideOtherSegmentsWhileDragging: boolean;
  isLocalTask: boolean;
}) {
  const hideSegWhileDragging =
    input.hideOtherSegmentsWhileDragging && input.draggableId !== input.activeDraggableId;
  const quickAddDimOpacity = input.hasQuickAddDraftMode && !input.isLocalTask ? 0.65 : 1;
  return {
    hideSegWhileDragging,
    segmentOpacity: (hideSegWhileDragging ? input.cardOpacity * 0.45 : input.cardOpacity) * quickAddDimOpacity,
  };
}

function computePlanSegmentInteractionState(input: {
  hasQuickAddDraftMode: boolean;
  isLocalTask: boolean;
  isQuickAddSubmitting: boolean;
  segmentEditorActive: boolean;
}) {
  const interactionBlockedByQuickAdd = input.hasQuickAddDraftMode && !input.isLocalTask;
  return {
    interactionDisabled:
      Boolean(input.segmentEditorActive) ||
      interactionBlockedByQuickAdd ||
      input.isQuickAddSubmitting,
  };
}

export function resolveTaskLayerPlanSegmentRenderState(input: {
  activeDraggableId: string | null;
  cardOpacity: number;
  hasMultiplePlanSegments: boolean;
  hasQuickAddDraftMode: boolean;
  hideOtherSegmentsWhileDragging: boolean;
  isComposerTarget?: boolean;
  planSegmentsLength: number;
  props: TaskLayerPositionedTaskItemProps;
  seg: PhaseSegment;
  segIdx: number;
  segmentEditorActive: boolean;
  taskId: string;
  timelineTotalParts: number;
}) {
  const {
    activeDraggableId,
    cardOpacity,
    hasMultiplePlanSegments,
    hasQuickAddDraftMode,
    hideOtherSegmentsWhileDragging,
    isComposerTarget = false,
    planSegmentsLength,
    props,
    seg,
    segIdx,
    segmentEditorActive,
    taskId,
    timelineTotalParts,
  } = input;
  const { quickAddSubmittingTaskId = null, task } = props;
  const isQuickAddSubmitting = quickAddSubmittingTaskId === taskId;
  const isActiveQuickAddTarget = isQuickAddDraftTask(task) || isComposerTarget;

  const geometry = computePlanSegmentGeometry({
    hasMultiplePlanSegments,
    seg,
    segIdx,
    taskId,
    timelineTotalParts,
  });
  const visual = computePlanSegmentVisualState({
    activeDraggableId,
    cardOpacity,
    draggableId: geometry.draggableId,
    hasQuickAddDraftMode,
    hideOtherSegmentsWhileDragging,
    isLocalTask: isActiveQuickAddTarget,
  });
  const interaction = computePlanSegmentInteractionState({
    hasQuickAddDraftMode,
    isLocalTask: isActiveQuickAddTarget,
    isQuickAddSubmitting,
    segmentEditorActive,
  });

  return {
    ...geometry,
    ...visual,
    ...interaction,
    isQuickAddSubmitting,
    fragmentKey: hasMultiplePlanSegments ? `${taskId}-seg-${segIdx}` : taskId,
    segmentBadge: hasMultiplePlanSegments
      ? { index: segIdx + 1, total: planSegmentsLength }
      : null,
    segmentSecondary: hasMultiplePlanSegments && segIdx > 0,
    isInError:
      !segmentEditorActive &&
      !isPlannerAnnotationTask(task) &&
      (props.errorTaskIds?.has(taskId) ?? false),
  };
}
