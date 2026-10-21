import type { SprintContextNote } from '@/lib/sprints/sprintContextTypes';
import type { SprintPlanPatchOp } from '@/lib/sprints/sprintPlanPatchTypes';

import { plannerCommentDurationPartsFromWidth } from '@/lib/comments/plannerCommentCardRow';
import { resolvePlanPatchCreateNoteSize } from '@/lib/sprints/sprintPlanPatchNoteSize';

/** Заметка на таймлайне после патча: интервал в ячейках [start, end). */
interface PlacedNote {
  assigneeId: string;
  end: number;
  id: string;
  start: number;
  text: string;
  touched: boolean;
}

const SNIPPET_MAX = 40;

const NOTE_OVERLAP_HINT =
  'note_overlap: move notes of one assignee apart in time (each warning names the first free slot), or accept a taller lane.';

export function buildNoteOverlapHints(warnings: readonly string[]): string[] {
  return warnings.length > 0 ? [NOTE_OVERLAP_HINT] : [];
}

function snippet(text: string): string {
  const flat = text.replaceAll(/\s+/g, ' ').trim();
  return flat.length > SNIPPET_MAX ? `${flat.slice(0, SNIPPET_MAX - 1)}…` : flat;
}

function placeNote(
  note: Pick<SprintContextNote, 'assigneeId' | 'day' | 'id' | 'part' | 'text' | 'width'>,
  partsPerDay: number,
  touched: boolean
): PlacedNote | null {
  if (note.day == null || note.part == null) {
    return null;
  }
  const start = note.day * partsPerDay + note.part;
  return {
    assigneeId: note.assigneeId,
    end: start + Math.max(1, note.width),
    id: note.id,
    start,
    text: note.text,
    touched,
  };
}

type UpdateNoteOp = Extract<SprintPlanPatchOp, { op: 'updateNote' }>;
type CreateNoteOp = Extract<SprintPlanPatchOp, { op: 'createNote' }>;

interface NoteState {
  note: SprintContextNote;
  touched: boolean;
}

function applyUpdateNote(prev: NoteState, op: UpdateNoteOp): NoteState {
  const note: SprintContextNote = {
    ...prev.note,
    ...(op.assigneeId === undefined ? {} : { assigneeId: op.assigneeId }),
    ...(op.day === undefined ? {} : { day: op.day }),
    ...(op.part === undefined ? {} : { part: op.part }),
    ...(op.text === undefined ? {} : { text: op.text }),
    ...(op.width === undefined ? {} : { width: plannerCommentDurationPartsFromWidth(op.width) }),
  };
  const moved = [op.assigneeId, op.day, op.part, op.width].some((value) => value !== undefined);
  return { note, touched: prev.touched || moved };
}

function createdNoteState(op: CreateNoteOp, id: string): NoteState {
  const size = resolvePlanPatchCreateNoteSize(op);
  return {
    note: {
      assigneeId: op.assigneeId,
      authorName: null,
      day: op.day,
      height: size.height,
      id,
      kind: 'text',
      part: op.part,
      text: op.text,
      width: plannerCommentDurationPartsFromWidth(size.width),
    },
    touched: true,
  };
}

function applyNoteOps(
  notes: readonly SprintContextNote[],
  ops: readonly SprintPlanPatchOp[]
): NoteState[] {
  const byId = new Map<string, NoteState>(
    // Свои прошлые черновики propose снимает перед записью новых.
    notes.filter((note) => note.pendingApproval !== true).map((note) => [note.id, { note, touched: false }])
  );
  ops.forEach((op, index) => {
    if (op.op === 'deleteNote') {
      byId.delete(op.commentId);
      return;
    }
    if (op.op === 'createNote') {
      byId.set(`createNote#${index}`, createdNoteState(op, `createNote#${index}`));
      return;
    }
    const prev = op.op === 'updateNote' ? byId.get(op.commentId) : undefined;
    if (prev && op.op === 'updateNote') {
      byId.set(op.commentId, applyUpdateNote(prev, op));
    }
  });
  return [...byId.values()];
}

function overlaps(a: { end: number; start: number }, b: { end: number; start: number }): boolean {
  return a.start < b.end && b.start < a.end;
}

function findFreeStart(
  note: PlacedNote,
  others: readonly PlacedNote[],
  totalCells: number
): number | null {
  const length = note.end - note.start;
  for (let start = note.start; start + length <= totalCells; start += 1) {
    const candidate = { end: start + length, start };
    if (!others.some((other) => overlaps(candidate, other))) {
      return start;
    }
  }
  return null;
}

function formatCell(cell: number, partsPerDay: number): string {
  return `day ${Math.floor(cell / partsPerDay)} part ${cell % partsPerDay}`;
}

function describeOverlap(
  note: PlacedNote,
  hits: readonly PlacedNote[],
  freeStart: number | null,
  partsPerDay: number
): string {
  const others = hits.map((hit) => `"${snippet(hit.text)}"`).join(', ');
  const free =
    freeStart == null
      ? 'no free slot of this length left for the assignee in the sprint'
      : `first free slot: ${formatCell(freeStart, partsPerDay)}`;
  return `note_overlap: "${snippet(note.text)}" (${note.assigneeId}, ${formatCell(note.start, partsPerDay)}, ${note.end - note.start} parts) overlaps ${others} in time — the swimlane stacks them into extra rows; ${free}`;
}

/**
 * Заметки одного исполнителя, пересекающиеся по времени после патча: свимлейн
 * разносит их по слоям, дорожка растёт. Предупреждение — только для заметок из патча.
 */
export function collectNoteOverlapWarnings(input: {
  dayCount: number;
  notes: readonly SprintContextNote[];
  ops: readonly SprintPlanPatchOp[];
  partsPerDay: number;
}): string[] {
  const placed = applyNoteOps(input.notes, input.ops).flatMap(({ note, touched }) => {
    const item = placeNote(note, input.partsPerDay, touched);
    return item ? [item] : [];
  });
  const totalCells = input.dayCount * input.partsPerDay;
  const warnings: string[] = [];
  for (const note of placed) {
    if (!note.touched) {
      continue;
    }
    const lane = placed.filter((other) => other.id !== note.id && other.assigneeId === note.assigneeId);
    const hits = lane.filter((other) => overlaps(note, other));
    if (hits.length > 0) {
      warnings.push(describeOverlap(note, hits, findFreeStart(note, lane, totalCells), input.partsPerDay));
    }
  }
  return warnings;
}
