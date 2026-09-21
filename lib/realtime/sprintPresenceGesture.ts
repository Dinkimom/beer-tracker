import type {
  SprintPresenceFocus,
  SprintPresenceGesture,
  SprintPresenceGestureCardRow,
  SprintPresenceGestureNote,
  SprintPresenceGesturePosition,
  SprintPresenceViewer,
} from './sprintRealtimeTypes';
import type { SprintPlannerNoteEditPreview } from '@/lib/layers/application/mobx/sprintPlannerUiTypes';

import { PARTS_PER_DAY } from '@/constants';
import { isStickyNoteColor } from '@/lib/comments/stickyNoteColor';

import { SPRINT_PRESENCE_GESTURE_KINDS } from './sprintRealtimeTypes';

const SPRINT_PRESENCE_GESTURE_NOTE_MAX = 2000;
const SPRINT_PRESENCE_GESTURE_POSITION_MS = 50;
const SPRINT_PRESENCE_GESTURE_NOTE_MS = 150;
const SPRINT_PRESENCE_CARD_ROW_SPAN_MAX = 10;

const GESTURE_KINDS = new Set<string>(SPRINT_PRESENCE_GESTURE_KINDS);

function isFiniteInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value);
}

function parseGesturePosition(value: unknown): SprintPresenceGesturePosition | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const row = value as Record<string, unknown>;
  if (!isFiniteInt(row.duration) || row.duration < 1 || row.duration > 400) {
    return undefined;
  }
  if (!isFiniteInt(row.startDay) || row.startDay < 0 || row.startDay > 400) {
    return undefined;
  }
  if (!isFiniteInt(row.startPart) || row.startPart < 0 || row.startPart > 12) {
    return undefined;
  }
  const assignee = typeof row.assignee === 'string' ? row.assignee.trim() : '';
  return {
    duration: row.duration,
    startDay: row.startDay,
    startPart: row.startPart,
    ...(assignee ? { assignee } : {}),
  };
}

function parseGestureNote(value: unknown): SprintPresenceGestureNote | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const row = value as Record<string, unknown>;
  const text = typeof row.text === 'string' ? row.text.slice(0, SPRINT_PRESENCE_GESTURE_NOTE_MAX) : undefined;
  const color = typeof row.color === 'string' && isStickyNoteColor(row.color) ? row.color : undefined;
  if (text == null && color == null) {
    return undefined;
  }
  return {
    ...(color ? { color } : {}),
    ...(text != null ? { text } : {}),
  };
}

function parseGestureCardRow(value: unknown): SprintPresenceGestureCardRow | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const row = value as Record<string, unknown>;
  if (!isFiniteInt(row.span) || row.span < 1 || row.span > SPRINT_PRESENCE_CARD_ROW_SPAN_MAX) {
    return undefined;
  }
  if (!isFiniteInt(row.layerShiftUp) || row.layerShiftUp < 0 || row.layerShiftUp >= row.span) {
    return undefined;
  }
  return { layerShiftUp: row.layerShiftUp, span: row.span };
}

export function parseSprintPresenceGesture(value: unknown): SprintPresenceGesture | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.kind !== 'string' || !GESTURE_KINDS.has(row.kind)) {
    return undefined;
  }
  const cardRow = parseGestureCardRow(row.cardRow);
  const note = parseGestureNote(row.note);
  const position = parseGesturePosition(row.position);
  if (!cardRow && !note && !position) {
    return undefined;
  }
  return {
    kind: row.kind as SprintPresenceGesture['kind'],
    ...(cardRow ? { cardRow } : {}),
    ...(note ? { note } : {}),
    ...(position ? { position } : {}),
  };
}

function serializeSprintPresenceGesture(gesture: SprintPresenceGesture): SprintPresenceGesture {
  return {
    kind: gesture.kind,
    ...(gesture.cardRow ? { cardRow: { ...gesture.cardRow } } : {}),
    ...(gesture.note ? { note: { ...gesture.note } } : {}),
    ...(gesture.position ? { position: { ...gesture.position } } : {}),
  };
}

export function sprintPresenceGestureEquals(
  left: SprintPresenceGesture | null | undefined,
  right: SprintPresenceGesture | null | undefined
): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

export function sprintPresenceGesturePublishKey(gesture: SprintPresenceGesture | null): string {
  return gesture ? JSON.stringify(serializeSprintPresenceGesture(gesture)) : '';
}

export function sprintPresenceGesturePublishDelayMs(
  focusKey: string,
  gesture: SprintPresenceGesture | null
): number {
  if (gesture?.cardRow || gesture?.position) {
    return SPRINT_PRESENCE_GESTURE_POSITION_MS;
  }
  if (gesture?.note) {
    return SPRINT_PRESENCE_GESTURE_NOTE_MS;
  }
  if (
    focusKey.startsWith('dragging:') ||
    focusKey.startsWith('editing:') ||
    focusKey.startsWith('linking:') ||
    focusKey.startsWith('resizing:')
  ) {
    return 0;
  }
  return 300;
}

function startCellFromPresencePosition(position: SprintPresenceGesturePosition): number {
  return position.startDay * PARTS_PER_DAY + position.startPart;
}

function presencePositionFromStartCell(
  startCell: number,
  duration: number,
  assignee?: string | null
): SprintPresenceGesturePosition {
  return {
    duration,
    startDay: Math.floor(startCell / PARTS_PER_DAY),
    startPart: startCell % PARTS_PER_DAY,
    ...(assignee ? { assignee } : {}),
  };
}

interface LocalSprintPresenceGestureInput {
  cardRowLayerShiftUp?: number | null;
  cardRowSpan?: number | null;
  cardRowTaskId?: string | null;
  dragAssigneeId?: string | null;
  dragDay?: number | null;
  dragDuration?: number | null;
  draggingTaskId: string | null;
  dragPart?: number | null;
  focus: SprintPresenceFocus | null;
  noteAssignee?: string | null;
  noteColor?: string | null;
  noteDay?: number | null;
  noteDuration?: number | null;
  notePart?: number | null;
  noteTaskId?: string | null;
  noteText?: string | null;
  occupancyDuration?: number | null;
  occupancyStartDay?: number | null;
  occupancyStartPart?: number | null;
  occupancyTaskId?: string | null;
  resizeDuration?: number | null;
  resizeStartCell?: number | null;
  resizeTaskId?: string | null;
}

function optionalGestureNote(input: LocalSprintPresenceGestureInput): SprintPresenceGestureNote | undefined {
  const text = input.noteText ?? undefined;
  const color = input.noteColor ?? undefined;
  if (text == null && color == null) {
    return undefined;
  }
  return {
    ...(color ? { color } : {}),
    ...(text != null ? { text } : {}),
  };
}

function optionalCardRow(input: LocalSprintPresenceGestureInput): SprintPresenceGestureCardRow | undefined {
  if (
    input.cardRowTaskId == null ||
    input.cardRowSpan == null ||
    input.cardRowLayerShiftUp == null
  ) {
    return undefined;
  }
  return parseGestureCardRow({
    layerShiftUp: input.cardRowLayerShiftUp,
    span: input.cardRowSpan,
  });
}

function optionalNotePosition(
  input: LocalSprintPresenceGestureInput
): SprintPresenceGesturePosition | undefined {
  if (input.noteDuration == null || input.noteDay == null || input.notePart == null) {
    return undefined;
  }
  const assignee = input.noteAssignee?.trim();
  return {
    duration: input.noteDuration,
    startDay: input.noteDay,
    startPart: input.notePart,
    ...(assignee ? { assignee } : {}),
  };
}

function buildLocalNoteGesture(
  input: LocalSprintPresenceGestureInput,
  focus: SprintPresenceFocus
): SprintPresenceGesture | null {
  if (focus.state !== 'editing' || input.noteTaskId !== focus.targetId) {
    return null;
  }
  const note = optionalGestureNote(input);
  const position = optionalNotePosition(input);
  if (!note && !position) {
    return null;
  }
  return {
    kind: 'edit',
    ...(note ? { note } : {}),
    ...(position ? { position } : {}),
  };
}

function buildLocalOccupancyGesture(
  input: LocalSprintPresenceGestureInput,
  focus: SprintPresenceFocus
): SprintPresenceGesture | null {
  if (focus.state !== 'dragging' && focus.state !== 'resizing') {
    return null;
  }
  if (
    input.occupancyTaskId !== focus.targetId ||
    input.occupancyDuration == null ||
    input.occupancyStartDay == null ||
    input.occupancyStartPart == null
  ) {
    return null;
  }
  return {
    kind: focus.state === 'resizing' ? 'resize' : 'drag',
    position: {
      duration: input.occupancyDuration,
      startDay: input.occupancyStartDay,
      startPart: input.occupancyStartPart,
    },
  };
}

function buildLocalResizeGesture(
  input: LocalSprintPresenceGestureInput,
  focus: SprintPresenceFocus
): SprintPresenceGesture | null {
  if (focus.state !== 'resizing' || input.resizeTaskId !== focus.targetId || input.resizeDuration == null) {
    return null;
  }
  const startCell =
    input.resizeStartCell ??
    (input.noteDay != null && input.notePart != null
      ? input.noteDay * PARTS_PER_DAY + input.notePart
      : null);
  if (startCell == null) {
    return null;
  }
  const note = optionalGestureNote(input);
  return {
    kind: 'resize',
    position: presencePositionFromStartCell(startCell, input.resizeDuration),
    ...(note ? { note } : {}),
  };
}

function buildLocalDragGesture(
  input: LocalSprintPresenceGestureInput,
  focus: SprintPresenceFocus
): SprintPresenceGesture | null {
  if (
    focus.state !== 'dragging' ||
    input.draggingTaskId !== focus.targetId ||
    input.dragDay == null ||
    input.dragPart == null ||
    input.dragDuration == null
  ) {
    return null;
  }
  const note = optionalGestureNote(input);
  return {
    kind: 'drag',
    position: {
      assignee: input.dragAssigneeId?.trim() || undefined,
      duration: input.dragDuration,
      startDay: input.dragDay,
      startPart: input.dragPart,
    },
    ...(note ? { note } : {}),
  };
}

function attachCardRowToGesture(
  gesture: SprintPresenceGesture,
  input: LocalSprintPresenceGestureInput,
  focus: SprintPresenceFocus
): SprintPresenceGesture {
  if (input.cardRowTaskId !== focus.targetId) {
    return gesture;
  }
  const cardRow = optionalCardRow(input);
  return cardRow ? { ...gesture, cardRow } : gesture;
}

function buildLocalCardRowResizeGesture(
  input: LocalSprintPresenceGestureInput,
  focus: SprintPresenceFocus
): SprintPresenceGesture | null {
  if (focus.state !== 'resizing' || input.cardRowTaskId !== focus.targetId) {
    return null;
  }
  const cardRow = optionalCardRow(input);
  if (!cardRow) {
    return null;
  }
  const note = optionalGestureNote(input);
  const position = optionalNotePosition(input);
  return {
    kind: 'resize',
    cardRow,
    ...(note ? { note } : {}),
    ...(position ? { position } : {}),
  };
}

export function buildLocalSprintPresenceGesture(
  input: LocalSprintPresenceGestureInput
): SprintPresenceGesture | null {
  const focus = input.focus;
  if (!focus) {
    return null;
  }
  const gesture =
    buildLocalNoteGesture(input, focus) ??
    buildLocalOccupancyGesture(input, focus) ??
    buildLocalResizeGesture(input, focus) ??
    buildLocalCardRowResizeGesture(input, focus) ??
    buildLocalDragGesture(input, focus);
  return gesture ? attachCardRowToGesture(gesture, input, focus) : null;
}

function notePreviewFromRemoteViewer(
  viewer: SprintPresenceViewer,
  taskId: string,
  ownClientId: string | null
): SprintPlannerNoteEditPreview | null {
  const note = viewer.gesture?.note;
  if (viewer.focus?.targetId !== taskId || !note) {
    return null;
  }
  if (ownClientId && viewer.clientId === ownClientId) {
    return null;
  }
  return {
    taskId,
    ...(note.color && isStickyNoteColor(note.color) ? { color: note.color } : {}),
    ...(note.text != null ? { text: note.text } : {}),
  };
}

export function remotePresenceNotePreview(
  viewers: readonly SprintPresenceViewer[],
  taskId: string,
  ownClientId: string | null
): SprintPlannerNoteEditPreview | null {
  for (const viewer of viewers) {
    const preview = notePreviewFromRemoteViewer(viewer, taskId, ownClientId);
    if (preview) {
      return preview;
    }
  }
  return null;
}

export function remotePresenceResizePreview(
  viewers: readonly SprintPresenceViewer[],
  ownClientId: string | null
): {
  assignee?: string;
  duration: number;
  note?: SprintPresenceGestureNote;
  startCell: number | null;
  taskId: string;
} | null {
  for (const viewer of viewers) {
    const position = viewer.gesture?.position;
    const taskId = viewer.focus?.targetId;
    if (!position || !taskId) {
      continue;
    }
    if (ownClientId && viewer.clientId === ownClientId) {
      continue;
    }
    return {
      duration: position.duration,
      startCell: startCellFromPresencePosition(position),
      taskId,
      ...(position.assignee ? { assignee: position.assignee } : {}),
      ...(viewer.gesture?.note ? { note: viewer.gesture.note } : {}),
    };
  }
  return null;
}

export function remotePresenceCardRowPreviews(
  viewers: readonly SprintPresenceViewer[],
  ownClientId: string | null
): Map<string, SprintPresenceGestureCardRow> {
  const next = new Map<string, SprintPresenceGestureCardRow>();
  for (const viewer of viewers) {
    const cardRow = viewer.gesture?.cardRow;
    const taskId = viewer.focus?.targetId;
    if (!cardRow || !taskId) {
      continue;
    }
    if (ownClientId && viewer.clientId === ownClientId) {
      continue;
    }
    next.set(taskId, cardRow);
  }
  return next;
}

export function remotePresenceOccupancyPreviews(
  viewers: readonly SprintPresenceViewer[],
  ownClientId: string | null
): Map<string, { duration: number; startDay: number; startPart: number }> {
  const next = new Map<string, { duration: number; startDay: number; startPart: number }>();
  for (const viewer of viewers) {
    const position = viewer.gesture?.position;
    const taskId = viewer.focus?.targetId;
    if (!position || !taskId) {
      continue;
    }
    if (ownClientId && viewer.clientId === ownClientId) {
      continue;
    }
    next.set(taskId, {
      duration: position.duration,
      startDay: position.startDay,
      startPart: position.startPart,
    });
  }
  return next;
}
