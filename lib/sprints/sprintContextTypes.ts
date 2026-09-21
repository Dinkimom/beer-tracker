import type { FeatureLanesDocument } from '@/lib/sprints/featureLanesDocument';
import type { BoardAvailabilityEventType, TechSprintType } from '@/types/quarterly';

export const SPRINT_CONTEXT_SCHEMA_VERSION = 2 as const;

interface SprintContextPositionSegment {
  duration: number;
  startDay: number;
  startPart: number;
}

export interface SprintContextPosition {
  assigneeEmail?: string | null;
  assigneeId: string;
  assigneeName?: string | null;
  duration: number;
  isQa: boolean;
  issueType?: string | null;
  parentKey?: string | null;
  plannedDuration: number | null;
  plannedStartDay: number | null;
  plannedStartPart: number | null;
  segments?: SprintContextPositionSegment[];
  startDay: number;
  startPart: number;
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
  day: number | null;
  diagramText?: string[];
  id: string;
  kind: 'diagram' | 'image' | 'text';
  parent?: SprintContextNoteParent;
  part: number | null;
  pendingApproval?: boolean;
  /** Board card id for upsertLink (`comment:{id}`). */
  taskId?: string;
  text: string;
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
  legend: {
    day: string;
    part: string;
  };
  organizationId: string;
  schemaVersion: typeof SPRINT_CONTEXT_SCHEMA_VERSION;
  sprintId: number;
  sprintWindow?: SprintContextSprintWindow;
  warnings?: string[];
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
  }>;
  people: SprintContextCapacityPerson[];
  summary: string;
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
}

export interface SprintContextSoftMeta {
  boardId?: number;
  sprintWindow?: SprintContextSprintWindow;
  warnings?: string[];
}
