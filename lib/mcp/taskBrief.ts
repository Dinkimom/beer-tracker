import type {
  SprintContextGoalItem,
  SprintContextNote,
  SprintContextPayload,
  SprintContextPosition,
  SprintContextUnplannedTask,
} from '@/lib/sprints/sprintContextTypes';

import { toPlannerCommentTaskId } from '@/lib/planner/plannerCardKind';
import { expandPositionOccupiedCells, resolvePartsPerDay } from '@/lib/sprints/sprintContextCapacity';
import { formatSprintPlanSchedule } from '@/lib/sprints/sprintPlanScheduleFormat';

/** Соседняя задача в брифе: стрелка на доске или та же фича. */
interface TaskBriefNeighbor {
  assigneeName: string | null;
  /** Строка расписания, как в `schedule` у propose; null — задача не на доске. */
  schedule: string | null;
  statusCategory: string | null;
  summary: string | null;
  taskId: string;
}

/**
 * linked — стрелка между заметкой и задачей; parent — заметка про эту задачу или её фичу;
 * nearby — заметка на дорожке исполнителя в окне задачи.
 */
type TaskBriefNoteRelation = 'linked' | 'nearby' | 'parent';

interface TaskBriefNote {
  authorName: string | null;
  diagramText?: string[];
  id: string;
  kind: SprintContextNote['kind'];
  relation: TaskBriefNoteRelation;
  text: string;
}

interface TaskBriefPlan {
  /** Задача на доске: исполнитель и окно; null — в спринте, но не разложена. */
  assigneeName: string | null;
  isQa: boolean;
  parentKey: string | null;
  schedule: string | null;
  statusCategory: string | null;
  statusDisplay: string | null;
  summary: string | null;
}

interface TaskBriefPlanning {
  /** Задачи, в которые идёт стрелка из этой: они ждут её. */
  blocks: TaskBriefNeighbor[];
  /** Задачи, из которых на доске идёт стрелка в эту: их делают раньше. */
  dependsOn: TaskBriefNeighbor[];
  /** Остальные задачи той же фичи (родитель или черновая фича на доске). */
  feature: TaskBriefNeighbor[];
  notes: TaskBriefNote[];
  /** null — задачи нет ни на доске, ни в бэклоге спринта. */
  plan: TaskBriefPlan | null;
  sprintGoals: { delivery: SprintContextGoalItem[]; discovery: SprintContextGoalItem[] };
  sprintName: string | null;
}

interface BriefIndex {
  partsPerDay: number;
  payload: SprintContextPayload;
  positions: Map<string, SprintContextPosition>;
  unplanned: Map<string, SprintContextUnplannedTask>;
}

function scheduleOf(index: BriefIndex, position: SprintContextPosition | undefined): string | null {
  if (!position) {
    return null;
  }
  const [line] = formatSprintPlanSchedule([position], index.payload.meta.calendarDays ?? [], index.partsPerDay);
  return line ?? null;
}

function neighbor(index: BriefIndex, taskId: string): TaskBriefNeighbor {
  const position = index.positions.get(taskId);
  const unplanned = index.unplanned.get(taskId);
  return {
    assigneeName: position?.assigneeName ?? unplanned?.assigneeName ?? null,
    schedule: scheduleOf(index, position),
    statusCategory: position?.statusCategory ?? unplanned?.statusCategory ?? null,
    summary: position?.summary ?? unplanned?.summary ?? null,
    taskId,
  };
}

/** Ключи задач фичи: тот же родитель в трекере и черновые фичи доски, куда входит задача. */
function featureTaskIds(index: BriefIndex, taskId: string, parentKey: string | null): Set<string> {
  const ids = new Set<string>();
  const parentOf = (id: string) =>
    index.positions.get(id)?.parentKey ?? index.unplanned.get(id)?.parentKey ?? null;
  if (parentKey) {
    for (const id of [...index.positions.keys(), ...index.unplanned.keys()]) {
      if (parentOf(id) === parentKey) {
        ids.add(id);
      }
    }
  }
  for (const row of index.payload.featureLanes?.draftRows ?? []) {
    if (row.issueKeys?.includes(taskId)) {
      row.issueKeys.forEach((key) => ids.add(key));
    }
  }
  ids.delete(taskId);
  return ids;
}

function occupiedCells(position: SprintContextPosition, partsPerDay: number): Set<number> {
  return new Set(
    expandPositionOccupiedCells(position, partsPerDay).map((cell) => cell.day * partsPerDay + cell.part)
  );
}

function noteRelation(
  note: SprintContextNote,
  input: { cells: Set<number>; linkedNoteIds: Set<string>; partsPerDay: number; position?: SprintContextPosition; scopeKeys: Set<string> }
): TaskBriefNoteRelation | null {
  if (input.linkedNoteIds.has(note.id)) {
    return 'linked';
  }
  if (note.parent && input.scopeKeys.has(note.parent.key)) {
    return 'parent';
  }
  if (!input.position || note.assigneeId !== input.position.assigneeId || note.day == null || note.part == null) {
    return null;
  }
  const start = note.day * input.partsPerDay + note.part;
  for (let cell = start; cell < start + Math.max(1, note.width); cell += 1) {
    if (input.cells.has(cell)) {
      return 'nearby';
    }
  }
  return null;
}

function briefNotes(index: BriefIndex, taskId: string, parentKey: string | null): TaskBriefNote[] {
  const noteIdByCardId = new Map(index.payload.notes.flatMap((note) => [[note.id, note.id], [toPlannerCommentTaskId(note.id), note.id]]));
  const linkedNoteIds = new Set<string>();
  for (const link of index.payload.taskLinks) {
    const ends = [link.fromTaskId, link.toTaskId];
    const noteId = ends.includes(taskId) ? ends.map((end) => noteIdByCardId.get(end)).find(Boolean) : undefined;
    if (noteId) {
      linkedNoteIds.add(noteId);
    }
  }
  const position = index.positions.get(taskId);
  const input = {
    cells: position ? occupiedCells(position, index.partsPerDay) : new Set<number>(),
    linkedNoteIds,
    partsPerDay: index.partsPerDay,
    position,
    scopeKeys: new Set(parentKey ? [taskId, parentKey] : [taskId]),
  };
  return index.payload.notes.flatMap((note) => {
    const relation = noteRelation(note, input);
    if (!relation || note.pendingApproval) {
      return [];
    }
    return [
      {
        authorName: note.authorName,
        ...(note.diagramText?.length ? { diagramText: note.diagramText } : {}),
        id: note.id,
        kind: note.kind,
        relation,
        text: note.text,
      },
    ];
  });
}

/**
 * Всё, что доска знает про одну задачу: где она в плане, от чего зависит по стрелкам, кого блокирует,
 * соседи по фиче, заметки рядом и цели спринта. То, чего нет ни в трекере, ни в коде.
 */
export function buildTaskBriefPlanning(payload: SprintContextPayload, taskId: string): TaskBriefPlanning {
  const index: BriefIndex = {
    partsPerDay: resolvePartsPerDay(payload.meta.partsPerDay),
    payload,
    positions: new Map(payload.positions.map((position) => [position.taskId, position])),
    unplanned: new Map((payload.unplannedTasks ?? []).map((task) => [task.taskId, task])),
  };
  const position = index.positions.get(taskId);
  const unplanned = index.unplanned.get(taskId);
  const parentKey = position?.parentKey ?? unplanned?.parentKey ?? null;
  const isTask = (id: string) => index.positions.has(id) || index.unplanned.has(id);
  const links = payload.taskLinks;
  return {
    blocks: links.filter((l) => l.fromTaskId === taskId && isTask(l.toTaskId)).map((l) => neighbor(index, l.toTaskId)),
    dependsOn: links.filter((l) => l.toTaskId === taskId && isTask(l.fromTaskId)).map((l) => neighbor(index, l.fromTaskId)),
    feature: [...featureTaskIds(index, taskId, parentKey)].sort().map((id) => neighbor(index, id)),
    notes: briefNotes(index, taskId, parentKey),
    plan:
      position || unplanned
        ? {
            assigneeName: position?.assigneeName ?? unplanned?.assigneeName ?? null,
            isQa: position?.isQa ?? false,
            parentKey,
            schedule: scheduleOf(index, position),
            statusCategory: position?.statusCategory ?? unplanned?.statusCategory ?? null,
            statusDisplay: position?.statusDisplay ?? unplanned?.statusDisplay ?? null,
            summary: position?.summary ?? unplanned?.summary ?? null,
          }
        : null,
    sprintGoals: payload.sprintGoals,
    sprintName: payload.meta.sprintWindow?.name ?? null,
  };
}
