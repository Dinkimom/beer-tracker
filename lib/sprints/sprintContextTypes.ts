import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { AgentReactionView } from '@/lib/comments/stickyNoteReaction';
import type { DomainRole, Platform } from '@/lib/roles/catalog';
import type { FeatureLanesDocument } from '@/lib/sprints/featureLanesDocument';
import type { BoardAvailabilityEventType, TechSprintType } from '@/types/quarterly';

export const SPRINT_CONTEXT_SCHEMA_VERSION = 2 as const;

interface SprintContextPositionSegment {
  duration: number;
  startDay: number;
  startPart: number;
}

export interface SprintContextPlanVsActual {
  actualParts: number;
  /** Best-effort: closed sprint and issue unfinished or missing from sprint board. */
  carriedOver?: boolean;
  planParts: number;
  slippedParts: number;
}

interface SprintContextSprintHistoryItem {
  name: string;
  sprintId: string;
}

export interface SprintContextPosition {
  assigneeEmail?: string | null;
  assigneeId: string;
  assigneeName?: string | null;
  createdAt?: string | null;
  duration: number;
  isQa: boolean;
  issueType?: string | null;
  parentKey?: string | null;
  plannedDuration: number | null;
  plannedStartDay: number | null;
  plannedStartPart: number | null;
  planVsActual?: SprintContextPlanVsActual;
  priority?: string | null;
  segments?: SprintContextPositionSegment[];
  /** Soft from tracker: sprints the issue belongs/belonged to (current + closed). */
  sprintHistory?: SprintContextSprintHistoryItem[];
  startDay: number;
  startPart: number;
  /** Tracker status key (e.g. inProgress / closed). */
  status?: string | null;
  /**
   * Planning category: not-started | in-progress | paused | done
   * (value for not-started matches TaskStatus backlog bucket).
   * Prefer for “in work” filters — uses status-name heuristics
   * (e.g. Ready for development → not-started) over raw Jira statusCategory.
   */
  statusCategory?: string | null;
  statusDisplay?: string | null;
  /** Raw tracker status category (Jira: new / inProgress / done). */
  statusType?: string | null;
  summary?: string | null;
  taskId: string;
}

interface SprintContextNoteParent {
  display: string;
  id: string;
  key: string;
  self?: string;
}

export interface SprintContextNote {
  assigneeId: string;
  assigneeName?: string | null;
  authorName: string | null;
  /** Sticky color as rendered (text notes only; unset color renders yellow). */
  color?: StickyNoteColor;
  day: number | null;
  diagramText?: string[];
  /** Card height on the swimlane in rows (1 = one task card). */
  height: number;
  id: string;
  kind: 'diagram' | 'image' | 'text' | 'widget';
  parent?: SprintContextNoteParent;
  part: number | null;
  pendingApproval?: boolean;
  /** Кто какой emoji поставил на заметку (только если реакции есть); ✅ — отметили сделанным. */
  reactions?: AgentReactionView[];
  /** Board card id for upsertLink (`comment:{id}`). */
  taskId?: string;
  text: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
  /** Optimistic concurrency token for updateNote.ifVersion. */
  version?: number;
  /** Card length on the timeline in parts (same unit as position duration). */
  width: number;
}

export interface SprintContextTaskLink {
  fromAnchor: string | null;
  fromTaskId: string;
  id: string;
  toAnchor: string | null;
  toTaskId: string;
}

export interface SprintContextGoalItem {
  done: boolean;
  id: string;
  text: string;
}

interface SprintContextGoals {
  delivery: SprintContextGoalItem[];
  discovery: SprintContextGoalItem[];
}

export interface SprintContextAvailabilityEvent {
  endDate: string;
  eventType: BoardAvailabilityEventType;
  id: string;
  memberId: string;
  memberName: string;
  startDate: string;
  techSprintSubtype?: TechSprintType;
}

interface SprintContextSprintWindow {
  endDate: string;
  name?: string;
  startDate: string;
  status?: string;
}

export interface SprintContextCalendarDay {
  date: string;
  day: number;
}

/** Saturday or Sunday inside the sprint window. These dates have no planner day index. */
export interface SprintContextWeekendDay {
  date: string;
  weekday: 'saturday' | 'sunday';
}

/**
 * Public / production-calendar non-working weekday inside the sprint window.
 * Keeps the same planner day index as meta.calendarDays (do not drop the column).
 */
export interface SprintContextHolidayDay {
  date: string;
  day: number;
}

export interface SprintContextAgendaItem {
  assigneeId: string;
  assigneeName?: string | null;
  date?: string;
  day: number;
  duration: number;
  isQa: boolean;
  part: number;
  summary?: string | null;
  taskId: string;
}

interface SprintContextMeta {
  boardId?: number;
  calendarDays?: SprintContextCalendarDay[];
  featureId?: string;
  /** ISO country used for holidayDays / capacity (organizations.settings.planner.holidayCountry). */
  holidayCountry?: string;
  /**
   * Non-working weekdays (public holidays / production-calendar transfers).
   * Same day index as calendarDays; capacity treats them as unavailable for everyone.
   */
  holidayDays?: SprintContextHolidayDay[];
  legend: {
    day: string;
    note: string;
    part: string;
  };
  organizationId: string;
  /** Org planner grid: timeslots per working day (2–4). Capacity and part indices use this. */
  partsPerDay: number;
  schemaVersion: typeof SPRINT_CONTEXT_SCHEMA_VERSION;
  sprintId: number;
  sprintWindow?: SprintContextSprintWindow;
  warnings?: string[];
  /** Sat/Sun inside the sprint window. No day index — do not place positions on these dates. */
  weekendDays?: SprintContextWeekendDay[];
}

export interface SprintContextCapacityOverlap {
  cell: { day: number; part: number };
  date?: string;
  taskIds: string[];
}

export interface SprintContextCapacityPersonDay {
  date?: string;
  day: number;
  loadParts: number;
  maxParts: number;
  unavailable?: boolean;
}

export interface SprintContextCapacityPerson {
  assigneeId: string;
  assigneeName?: string | null;
  days: SprintContextCapacityPersonDay[];
  gaps: Array<{ date?: string; day: number; part: number }>;
  overlaps: SprintContextCapacityOverlap[];
  /** Платформы разработчика (web/back), если role=developer. */
  platforms?: Platform[];
  /** Доменная роль из team_members.role_slug. */
  role?: DomainRole;
  roleTitle?: string | null;
  totalLoadParts: number;
  totalMaxParts: number;
}

export interface SprintContextCapacityReport {
  overloaded: Array<{
    assigneeId: string;
    assigneeName?: string | null;
    date?: string;
    day: number;
    loadParts: number;
    role?: DomainRole;
    roleTitle?: string | null;
  }>;
  people: SprintContextCapacityPerson[];
  summary: string;
}

/** Участник команды доски спринта (roster), с ролью из team_members. */
export interface SprintContextTeamMember {
  assigneeId: string;
  assigneeName: string;
  email?: string | null;
  platforms?: Platform[];
  role: DomainRole;
  roleTitle?: string | null;
  staffUid?: string;
}

/** Задача спринта в трекере без позиции на доске (бэклог спринта в планере). */
export interface SprintContextUnplannedTask {
  /** Id пользователя трекера — тот же формат, что у positions[].assigneeId и teamMembers. */
  assigneeId?: string | null;
  assigneeName?: string | null;
  issueType?: string | null;
  parentKey?: string | null;
  priority?: string | null;
  qaEngineerName?: string | null;
  status?: string | null;
  statusCategory?: string | null;
  statusDisplay?: string | null;
  storyPoints?: number | null;
  summary: string;
  taskId: string;
  testPoints?: number | null;
}

export interface SprintContextPayload {
  agenda: SprintContextAgendaItem[];
  availability: SprintContextAvailabilityEvent[];
  capacity?: SprintContextCapacityReport;
  featureLanes: FeatureLanesDocument | null;
  meta: SprintContextMeta;
  notes: SprintContextNote[];
  positions: SprintContextPosition[];
  sprintGoals: SprintContextGoals;
  taskLinks: SprintContextTaskLink[];
  /** Состав команды доски (meta.boardId) с ролями; пусто если board неизвестен. */
  teamMembers?: SprintContextTeamMember[];
  /** Задачи спринта из трекера, которых нет в positions; без трекера поля нет. */
  unplannedTasks?: SprintContextUnplannedTask[];
}

export interface SprintContextSoftMeta {
  boardId?: number;
  sprintWindow?: SprintContextSprintWindow;
  warnings?: string[];
}
