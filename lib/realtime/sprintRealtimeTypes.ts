import type { SprintTimerState } from './sprintTimerState';
import type { Task } from '@/types';

/** Ресурсы свимлейна, которые клиент перезапрашивает после события. */
export type SprintRealtimeResource = 'comments' | 'links' | 'positions' | 'reactions' | 'tasks';

export interface SprintRealtimeIssueStatus {
  issueKey: string;
  statusKey: string;
}

export interface SprintRealtimeIssueMembership {
  action: 'added' | 'removed';
  issueKey: string;
  /** Снимок при added — соседние вкладки патчат React Query без refetch Tracker. */
  task?: Task;
}

export interface SprintRealtimeEvent {
  at: number;
  issueMembership?: SprintRealtimeIssueMembership;
  issueStatus?: SprintRealtimeIssueStatus;
  organizationId: string;
  originClientId: string | null;
  resources: SprintRealtimeResource[];
  sprintId: number;
  type: 'sprint.changed';
}

export const SPRINT_PRESENCE_FOCUS_STATES = [
  'dragging',
  'editing',
  'linking',
  'resizing',
  'viewing',
] as const;

export type SprintPresenceFocusState = (typeof SPRINT_PRESENCE_FOCUS_STATES)[number];

export function isSprintPresenceMutatingFocusState(
  state: SprintPresenceFocusState | undefined
): boolean {
  return state === 'dragging' || state === 'editing' || state === 'resizing';
}

export const SPRINT_PRESENCE_BOARD_VIEWS = ['kanban', 'occupancy', 'swimlanes'] as const;

export type SprintPresenceBoardView = (typeof SPRINT_PRESENCE_BOARD_VIEWS)[number];

export interface SprintPresenceFocus {
  state: SprintPresenceFocusState;
  targetId: string;
}

export const SPRINT_PRESENCE_GESTURE_KINDS = ['drag', 'edit', 'resize'] as const;

type SprintPresenceGestureKind = (typeof SPRINT_PRESENCE_GESTURE_KINDS)[number];

export interface SprintPresenceGesturePosition {
  assignee?: string;
  duration: number;
  startDay: number;
  startPart: number;
}

export interface SprintPresenceGestureNote {
  color?: string;
  text?: string;
}

/** Вертикальный размер карточки в строках свимлейна (как stickyNoteCardRowPreview). */
export interface SprintPresenceGestureCardRow {
  layerShiftUp: number;
  span: number;
}

/** In-progress жест: куда едет бар / что печатают в заметке / высота карточки. */
export interface SprintPresenceGesture {
  cardRow?: SprintPresenceGestureCardRow;
  kind: SprintPresenceGestureKind;
  note?: SprintPresenceGestureNote;
  position?: SprintPresenceGesturePosition;
}

export interface SprintPresenceViewer {
  avatarUrl: string | null;
  /** Вид планера, который открыт у вкладки (свимлейн / канбан / occupancy). */
  boardView?: SprintPresenceBoardView;
  /** Id вкладки; нужен, чтобы не показывать своё присутствие на карточке. */
  clientId?: string;
  displayName: string;
  focus?: SprintPresenceFocus;
  gesture?: SprintPresenceGesture;
  userId: string;
}

interface SprintPresenceEvent {
  at: number;
  organizationId: string;
  sprintId: number;
  type: 'sprint.presence';
  viewers: SprintPresenceViewer[];
}

export interface SprintTimerEvent {
  at: number;
  organizationId: string;
  originClientId: string | null;
  sprintId: number;
  timer: SprintTimerState;
  type: 'sprint.timer';
}

export type SprintRealtimeMessage = SprintPresenceEvent | SprintRealtimeEvent | SprintTimerEvent;
