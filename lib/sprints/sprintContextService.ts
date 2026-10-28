import type { BoardAvailabilityEventType, TechSprintType } from '@/types/quarterly';

import { listBoardAvailabilityEvents } from '@/lib/boardAvailability/boardAvailabilityEventsRepository';
import { attachCommentReactionSummaries } from '@/lib/comments/commentReactionsRepository';
import { extractExcalidrawSceneText } from '@/lib/comments/excalidrawSceneText';
import {
  plannerCommentCardRowSpan,
  plannerCommentDurationPartsFromWidth,
} from '@/lib/comments/plannerCommentCardRow';
import { parseStickyNoteColor } from '@/lib/comments/stickyNoteColor';
import { groupReactionsForAgent } from '@/lib/comments/stickyNoteReaction';
import { asRecord } from '@/lib/isRecord';
import { findOrganizationById } from '@/lib/organizations';
import { toPlannerCommentTaskId } from '@/lib/planner/plannerCardKind';
import {
  commentIdSetFromRecords,
  resolvePlannerLinkEndpoints,
} from '@/lib/planner/plannerLinkEndpoint';
import {
  DEFAULT_PLANNER_TIMELINE_SCALE,
  readPlannerTimelineScale,
} from '@/lib/plannerTimelineScale';
import { listSprintGoals } from '@/lib/sprintGoals';
import { fetchFeatureLanes } from '@/lib/sprints/featureLanesRepository';
import { getSprintCommentDiagramScene } from '@/lib/sprints/sprintCommentDiagramsRepository';
import { listSprintComments } from '@/lib/sprints/sprintCommentsRepository';
import {
  dateRangesOverlap,
  expandLinkScopeWithNotes,
  expandScopeWithParentMap,
  filterFeatureLanesForFeature,
  filterLinksByFeatureScope,
  filterNotesByFeatureScope,
  filterPositionsByFeatureScope,
  parseNoteParentFromRow,
  resolveFeatureScopeTaskIds,
  toIsoDateOnly,
} from '@/lib/sprints/sprintContextFilter';
import {
  SPRINT_CONTEXT_SCHEMA_VERSION,
  type SprintContextAvailabilityEvent,
  type SprintContextGoalItem,
  type SprintContextNote,
  type SprintContextPayload,
  type SprintContextPosition,
  type SprintContextSoftMeta,
  type SprintContextTaskLink,
} from '@/lib/sprints/sprintContextTypes';
import { listTaskLinksForSprint } from '@/lib/sprints/taskLinksRepository';
import {
  attachSegmentsToPositions,
  listTaskPositionsForSprint,
  loadPositionSegmentsByTask,
} from '@/lib/sprints/taskPositionsRepository';

const DAY_LEGEND =
  'Zero-based index of a working day within the sprint timeline (not a calendar weekday). meta.weekendDays are Saturday and Sunday inside the sprint window; they have no day index and must not be used for positions.';

const NOTE_LEGEND =
  'notes[].width = card length in parts from (day, part), same unit as position duration; notes[].height = card height in rows (1 = one task card); notes[].color = sticky color (text notes); notes[].text is markdown (headings, - [ ]/- [x] checklists, bullets, **bold**, *italic*, ~~strike~~, `code`), - [x] = done. notes[].authorName = who created the note; notes[].reactions = [{emoji, count, by: names}] — ✅ means people marked the note done (the card also turns green). Cards of one assignee that overlap in time do not cover each other: the swimlane stacks them into extra rows, so the lane grows taller. Keep notes of one assignee apart in time to keep the lane compact.';

function partLegend(partsPerDay: number): string {
  return `Time segment within a working day: 0 .. ${partsPerDay - 1} (meta.partsPerDay=${partsPerDay}; duration is counted in these parts).`;
}

async function loadOrgPartsPerDay(organizationId: string): Promise<number> {
  const org = await findOrganizationById(organizationId);
  if (!org) {
    return DEFAULT_PLANNER_TIMELINE_SCALE.timeslotsPerDay;
  }
  return readPlannerTimelineScale(org.settings).timeslotsPerDay;
}


function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function mapPosition(row: Record<string, unknown>): SprintContextPosition {
  const segmentsRaw = row.segments;
  const segments = Array.isArray(segmentsRaw)
    ? segmentsRaw.flatMap((segment) => {
        const rec = asRecord(segment);
        if (!rec) {
          return [];
        }
        return [
          {
            duration: asNumber(rec.duration),
            startDay: asNumber(rec.start_day ?? rec.startDay),
            startPart: asNumber(rec.start_part ?? rec.startPart),
          },
        ];
      })
    : undefined;
  const position: SprintContextPosition = {
    assigneeId: asString(row.assignee_id ?? row.assigneeId),
    duration: asNumber(row.duration),
    isQa: Boolean(row.is_qa ?? row.isQa),
    plannedDuration: asNullableNumber(row.planned_duration ?? row.plannedDuration),
    plannedStartDay: asNullableNumber(row.planned_start_day ?? row.plannedStartDay),
    plannedStartPart: asNullableNumber(row.planned_start_part ?? row.plannedStartPart),
    startDay: asNumber(row.start_day ?? row.startDay),
    startPart: asNumber(row.start_part ?? row.startPart),
    taskId: asString(row.task_id ?? row.taskId),
  };
  if (segments && segments.length > 0) {
    position.segments = segments;
  }
  return position;
}

function mapCommentKind(value: unknown): SprintContextNote['kind'] {
  if (value === 'diagram' || value === 'image' || value === 'widget') {
    return value;
  }
  return 'text';
}

function readAuthorName(row: Record<string, unknown>): string | null {
  if (typeof row.author_name === 'string') {
    return row.author_name;
  }
  if (typeof row.authorName === 'string') {
    return row.authorName;
  }
  return null;
}

/** Черновик драфта; копия-замена ещё и ссылается на заметку, которую правит или удаляет. */
function markPendingNote(note: SprintContextNote, row: Record<string, unknown>): void {
  note.pendingApproval = true;
  const replaces = asString(row.replaces_comment_id, '');
  if (replaces) {
    note.replacesNoteId = replaces;
    note.replaceAction = row.replace_action === 'delete' ? 'delete' : 'update';
  }
}

function mapCommentRow(row: Record<string, unknown>): SprintContextNote {
  const parent = parseNoteParentFromRow(row.parent);
  const kind = mapCommentKind(row.kind);
  const rawWidth = asNumber(Number(row.width));
  const note: SprintContextNote = {
    assigneeId: asString(row.assignee_id ?? row.assigneeId),
    authorName: readAuthorName(row),
    day: asNullableNumber(row.day),
    height: plannerCommentCardRowSpan({ height: asNumber(Number(row.height)), kind, width: rawWidth }),
    id: asString(row.id),
    kind,
    part: asNullableNumber(row.part),
    taskId: toPlannerCommentTaskId(asString(row.id)),
    text: kind === 'widget' ? 'Tic-tac-toe' : asString(row.text),
    width: plannerCommentDurationPartsFromWidth(rawWidth),
  };
  if (kind === 'text') {
    note.color = parseStickyNoteColor(row.color);
  }
  if (parent) {
    note.parent = parent;
  }
  if (row.pending_approval === true || row.pendingApproval === true) {
    markPendingNote(note, row);
  }
  const updatedAt = row.updated_at ?? row.updatedAt;
  if (updatedAt instanceof Date) {
    note.updatedAt = updatedAt.toISOString();
  } else if (typeof updatedAt === 'string') {
    note.updatedAt = updatedAt;
  }
  const updatedBy = asString(row.updated_by ?? row.updatedBy, '');
  if (updatedBy) {
    note.updatedBy = updatedBy;
  }
  const version = asNullableNumber(row.version);
  if (version != null) {
    note.version = version;
  }
  return note;
}

function mapLink(row: Record<string, unknown>): SprintContextTaskLink {
  return {
    fromAnchor:
      typeof (row.from_anchor ?? row.fromAnchor) === 'string'
        ? ((row.from_anchor ?? row.fromAnchor) as string)
        : null,
    fromTaskId: asString(row.from_task_id ?? row.fromTaskId),
    id: asString(row.id),
    toAnchor:
      typeof (row.to_anchor ?? row.toAnchor) === 'string'
        ? ((row.to_anchor ?? row.toAnchor) as string)
        : null,
    toTaskId: asString(row.to_task_id ?? row.toTaskId),
  };
}

function rewriteLinksForNoteEndpoints(
  links: SprintContextTaskLink[],
  notes: SprintContextNote[]
): SprintContextTaskLink[] {
  const commentIds = commentIdSetFromRecords(notes);
  return links.map((link) => resolvePlannerLinkEndpoints(link, commentIds));
}

function mapGoal(row: { done: boolean; id: string; text: string }): SprintContextGoalItem {
  return {
    done: Boolean(row.done),
    id: String(row.id),
    text: row.text ?? '',
  };
}

const AVAILABILITY_TYPES = new Set(['duty', 'sick_leave', 'tech_sprint', 'vacation']);
const TECH_SUBTYPES = new Set(['back', 'qa', 'web']);

function mapAvailabilityRow(row: {
  end_date: unknown;
  event_type: string;
  id: string;
  member_id: string;
  member_name: string;
  start_date: unknown;
  tech_sprint_type: string | null;
}): SprintContextAvailabilityEvent | null {
  if (!AVAILABILITY_TYPES.has(row.event_type)) {
    return null;
  }
  const base: SprintContextAvailabilityEvent = {
    endDate: toIsoDateOnly(row.end_date),
    eventType: row.event_type as BoardAvailabilityEventType,
    id: row.id,
    memberId: row.member_id,
    memberName: row.member_name,
    startDate: toIsoDateOnly(row.start_date),
  };
  if (
    row.event_type === 'tech_sprint' &&
    row.tech_sprint_type &&
    TECH_SUBTYPES.has(row.tech_sprint_type)
  ) {
    return { ...base, techSprintSubtype: row.tech_sprint_type as TechSprintType };
  }
  return base;
}

async function loadPositions(input: {
  organizationId: string;
  sprintId: number;
}): Promise<SprintContextPosition[]> {
  const positions = await listTaskPositionsForSprint(input);
  if (positions.length > 0) {
    const segmentsByTask = await loadPositionSegmentsByTask(input.sprintId);
    attachSegmentsToPositions(positions, segmentsByTask);
  }
  return positions.map((row) => mapPosition(row as Record<string, unknown>));
}

/** Реакции на заметки: кто какой emoji поставил (нет реакций — поля нет). */
async function attachNoteReactions(
  notes: SprintContextNote[],
  input: { organizationId: string; viewerUserId?: string }
): Promise<SprintContextNote[]> {
  const summaries = await attachCommentReactionSummaries({
    comments: notes.map((note) => ({ id: note.id })),
    organizationId: input.organizationId,
    userId: input.viewerUserId ?? '',
  });
  const reactionsById = new Map(summaries.map((summary) => [summary.id, summary.reactions]));
  return notes.map((note) => {
    const votes = (reactionsById.get(note.id) ?? []).flatMap((reaction) =>
      reaction.users.length > 0
        ? reaction.users.map((user) => ({ emoji: reaction.emoji, name: user.name }))
        : Array.from({ length: reaction.count }, () => ({ emoji: reaction.emoji, name: '' }))
    );
    return votes.length > 0 ? { ...note, reactions: groupReactionsForAgent(votes) } : note;
  });
}

async function loadNotesWithDiagramText(input: {
  organizationId: string;
  sprintId: number;
  viewerUserId?: string;
}): Promise<SprintContextNote[]> {
  const rows = await listSprintComments(input);
  const notes = rows.flatMap((row) => {
    const rec = asRecord(row);
    return rec ? [mapCommentRow(rec)] : [];
  });

  await Promise.all(
    notes.map(async (note) => {
      if (note.kind !== 'diagram') {
        return;
      }
      try {
        const scene = await getSprintCommentDiagramScene({
          commentId: note.id,
          organizationId: input.organizationId,
          sprintId: input.sprintId,
        });
        if (!scene) {
          return;
        }
        const diagramText = extractExcalidrawSceneText(scene);
        if (diagramText.length > 0) {
          note.diagramText = diagramText;
        }
      } catch (error) {
        console.warn(`[sprint-context] diagram text for ${note.id}:`, error);
      }
    })
  );

  return attachNoteReactions(notes, input);
}

async function loadAvailability(input: {
  boardId: number | undefined;
  sprintWindow: SprintContextSoftMeta['sprintWindow'];
}): Promise<SprintContextAvailabilityEvent[]> {
  if (input.boardId == null) {
    return [];
  }
  const rows = await listBoardAvailabilityEvents(input.boardId);
  const mapped = rows.flatMap((row) => {
    const event = mapAvailabilityRow(row);
    return event ? [event] : [];
  });
  const window = input.sprintWindow;
  if (!window?.startDate || !window?.endDate) {
    return mapped;
  }
  return mapped.filter((event) =>
    dateRangesOverlap(event.startDate, event.endDate, window.startDate, window.endDate)
  );
}

export async function buildSprintContext(input: {
  featureId?: string;
  organizationId: string;
  softMeta?: SprintContextSoftMeta;
  sprintId: number;
  /** Optional soft map taskKey → parentKey (tracker); expands feature scope. */
  taskIdToParentKey?: Record<string, string>;
  /** Чей драфт показать: черновые заметки агента приватны. */
  viewerUserId?: string;
}): Promise<SprintContextPayload> {
  const { organizationId, sprintId } = input;
  const featureId = input.featureId?.trim() || undefined;
  const softMeta = input.softMeta ?? {};

  const [
    positions,
    featureLanes,
    notes,
    links,
    deliveryGoals,
    discoveryGoals,
    availability,
    partsPerDay,
  ] = await Promise.all([
    loadPositions({ organizationId, sprintId }),
    fetchFeatureLanes({ organizationId, sprintId }),
    loadNotesWithDiagramText({ organizationId, sprintId, viewerUserId: input.viewerUserId }),
    listTaskLinksForSprint({ organizationId, sprintId }).then((rows) =>
      rows.flatMap((row) => {
        const rec = asRecord(row);
        return rec ? [mapLink(rec)] : [];
      })
    ),
    listSprintGoals({ goalType: 'delivery', organizationId, sprintId }).then((rows) =>
      rows.map(mapGoal)
    ),
    listSprintGoals({ goalType: 'discovery', organizationId, sprintId }).then((rows) =>
      rows.map(mapGoal)
    ),
    loadAvailability({
      boardId: softMeta.boardId,
      sprintWindow: softMeta.sprintWindow,
    }),
    loadOrgPartsPerDay(organizationId),
  ]);

  let scopedPositions = positions;
  let scopedNotes = notes;
  let scopedLinks = rewriteLinksForNoteEndpoints(links, notes);
  let scopedLanes = featureLanes;

  if (featureId) {
    let scopeTaskIds = resolveFeatureScopeTaskIds(featureLanes, featureId);
    scopeTaskIds = expandScopeWithParentMap(scopeTaskIds, featureId, input.taskIdToParentKey);
    scopedPositions = filterPositionsByFeatureScope(positions, scopeTaskIds);
    scopedNotes = filterNotesByFeatureScope(notes, featureId, scopeTaskIds);
    scopedLinks = filterLinksByFeatureScope(
      scopedLinks,
      expandLinkScopeWithNotes(scopeTaskIds, scopedNotes)
    );
    scopedLanes = filterFeatureLanesForFeature(featureLanes, featureId);
  }

  const meta: SprintContextPayload['meta'] = {
    legend: { day: DAY_LEGEND, note: NOTE_LEGEND, part: partLegend(partsPerDay) },
    organizationId,
    partsPerDay,
    schemaVersion: SPRINT_CONTEXT_SCHEMA_VERSION,
    sprintId,
  };
  if (featureId) {
    meta.featureId = featureId;
  }
  if (softMeta.boardId != null) {
    meta.boardId = softMeta.boardId;
  }
  if (softMeta.sprintWindow) {
    meta.sprintWindow = softMeta.sprintWindow;
  }
  if (softMeta.warnings?.length) {
    meta.warnings = [...softMeta.warnings];
  }

  return {
    agenda: [],
    availability,
    featureLanes: scopedLanes,
    meta,
    notes: scopedNotes,
    positions: scopedPositions,
    sprintGoals: {
      delivery: deliveryGoals,
      discovery: discoveryGoals,
    },
    taskLinks: scopedLinks,
  };
}
