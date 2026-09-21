'use client';

import type { BoardViewMode } from '@/hooks/useLocalStorage';

import { observer } from 'mobx-react-lite';

import { useSprintCardPresenceReporter } from '@/hooks/useSprintCardPresenceReporter';
import { useRootStore } from '@/lib/layers';
import { resolveSprintCardPresenceFocus } from '@/lib/realtime/sprintCardPresence';
import { toSprintPresenceBoardView } from '@/lib/realtime/sprintPresenceBoardView';
import { buildLocalSprintPresenceGesture } from '@/lib/realtime/sprintPresenceGesture';

interface SprintPlannerPresenceSyncProps {
  dragAssigneeId?: string | null;
  dragDay?: number | null;
  dragDuration?: number | null;
  draggingTaskId: string | null;
  dragNoteColor?: string | null;
  dragNoteText?: string | null;
  dragPart?: number | null;
  sprintId: number | null;
  viewMode: BoardViewMode;
}

/** Observer-обёртка: читает фокус и live-жест из MobX и пишет presence. */
export const SprintPlannerPresenceSync = observer(function SprintPlannerPresenceSync({
  dragAssigneeId = null,
  dragDay = null,
  dragDuration = null,
  dragNoteColor = null,
  dragNoteText = null,
  dragPart = null,
  draggingTaskId,
  sprintId,
  viewMode,
}: SprintPlannerPresenceSyncProps) {
  const { sprintPlannerUi, taskPositions } = useRootStore();
  const contextMenuTaskId = sprintPlannerUi.contextMenuTaskId;
  const note = sprintPlannerUi.noteEditPreview;
  const editingTaskId = sprintPlannerUi.noteComposer?.taskId ?? note?.taskId ?? null;
  const hoveredTaskId = sprintPlannerUi.hoveredTaskId;
  const linkingTaskId = sprintPlannerUi.linkingFromTaskId;
  const resizingTaskId = sprintPlannerUi.resizingTaskId;
  const effectiveDraggingTaskId = draggingTaskId || sprintPlannerUi.boardDraggingTaskId;
  const focus = resolveSprintCardPresenceFocus({
    contextMenuTaskId,
    draggingTaskId: effectiveDraggingTaskId,
    editingTaskId,
    hoveredTaskId,
    linkingTaskId,
    resizingTaskId,
  });
  const occupancy = sprintPlannerUi.occupancyPresencePreview;
  const resize = sprintPlannerUi.taskResizePreview;
  const cardRow = sprintPlannerUi.stickyNoteCardRowPreview;
  const gestureAnchorTaskId =
    editingTaskId ?? resizingTaskId ?? effectiveDraggingTaskId ?? cardRow?.taskId ?? null;
  const notePosition = gestureAnchorTaskId
    ? taskPositions.positions.get(gestureAnchorTaskId)
    : undefined;
  const gesture = buildLocalSprintPresenceGesture({
    cardRowLayerShiftUp: cardRow?.layerShiftUp ?? null,
    cardRowSpan: cardRow?.span ?? null,
    cardRowTaskId: cardRow?.taskId ?? null,
    dragAssigneeId,
    dragDay,
    dragDuration,
    dragPart,
    draggingTaskId: effectiveDraggingTaskId,
    focus,
    noteAssignee: notePosition?.assignee ?? null,
    noteColor: note?.color ?? dragNoteColor,
    noteDay: notePosition?.startDay ?? null,
    noteDuration: notePosition?.duration ?? null,
    notePart: notePosition?.startPart ?? null,
    noteTaskId: note?.taskId ?? (dragNoteText != null || dragNoteColor != null ? effectiveDraggingTaskId : null),
    noteText: note?.text ?? dragNoteText,
    occupancyDuration: occupancy?.duration ?? null,
    occupancyStartDay: occupancy?.startDay ?? null,
    occupancyStartPart: occupancy?.startPart ?? null,
    occupancyTaskId: occupancy?.taskId ?? null,
    resizeDuration: resize?.duration ?? null,
    resizeStartCell: resize?.startCell ?? null,
    resizeTaskId: resize?.taskId ?? null,
  });
  useSprintCardPresenceReporter({
    boardView: toSprintPresenceBoardView(viewMode),
    contextMenuTaskId,
    draggingTaskId: effectiveDraggingTaskId,
    editingTaskId,
    gesture,
    hoveredTaskId,
    linkingTaskId,
    resizingTaskId,
    sprintId,
  });
  return null;
});
