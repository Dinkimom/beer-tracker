import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';
import type { SprintPlanPatchOp } from '@/lib/sprints/sprintPlanPatchTypes';

type PlanPatchPositionChange = 'duration' | 'schedule' | 'segments';

interface PlanPatchPositionSegment {
  duration: number;
  startDay: number;
  startPart: number;
}

/** Карточка предложения на доске: новое место, перенос, отрезки или снятие. */
export interface PlanPatchPositionPreview {
  assigneeId: string;
  changes: PlanPatchPositionChange[];
  clientBrand?: McpOAuthClientBrand;
  duration: number;
  remove: boolean;
  /** Предложенные отрезки; undefined — не трогать segments при approve. */
  segments?: PlanPatchPositionSegment[];
  startDay: number;
  startPart: number;
  /** Approve добавляет задачу в спринт трекера и назначает исполнителя (как apply). */
  syncToTracker?: boolean;
  taskId: string;
}

export interface PlanPatchPreviewSourcePosition {
  assigneeId: string;
  duration: number;
  segments?: PlanPatchPositionSegment[];
  startDay: number;
  startPart: number;
  taskId: string;
}

interface PlanPatchPreviewCaptionLabels {
  add: string;
  and: string;
  duration: string;
  remove: string;
  schedule: string;
  segments: string;
}

type PositionPatchOp = Extract<SprintPlanPatchOp, { op: 'deletePosition' | 'upsertPosition' }>;

function isPositionPatchOp(op: SprintPlanPatchOp): op is PositionPatchOp {
  return op.op === 'deletePosition' || op.op === 'upsertPosition';
}

function finalPositionOps(ops: readonly SprintPlanPatchOp[]): Map<string, PositionPatchOp> {
  const finals = new Map<string, PositionPatchOp>();
  for (const op of ops) {
    if (isPositionPatchOp(op)) {
      finals.set(op.taskId, op);
    }
  }
  return finals;
}

function copySegments(
  segments: readonly PlanPatchPositionSegment[] | undefined
): PlanPatchPositionSegment[] | undefined {
  if (segments === undefined) {
    return undefined;
  }
  return segments.map((segment) => ({
    duration: segment.duration,
    startDay: segment.startDay,
    startPart: segment.startPart,
  }));
}

/** Пустой массив и отсутствие отрезков считаем одним состоянием «целая полоса». */
function normalizePlanPatchSegments(
  segments: readonly PlanPatchPositionSegment[] | undefined
): PlanPatchPositionSegment[] | null {
  if (!segments || segments.length === 0) {
    return null;
  }
  return segments.map((segment) => ({
    duration: segment.duration,
    startDay: segment.startDay,
    startPart: segment.startPart,
  }));
}

function planPatchSegmentsEqual(
  left: readonly PlanPatchPositionSegment[] | undefined,
  right: readonly PlanPatchPositionSegment[] | undefined
): boolean {
  const a = normalizePlanPatchSegments(left);
  const b = normalizePlanPatchSegments(right);
  if (a === null && b === null) {
    return true;
  }
  if (a === null || b === null || a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index++) {
    const leftSeg = a[index]!;
    const rightSeg = b[index]!;
    if (
      leftSeg.startDay !== rightSeg.startDay ||
      leftSeg.startPart !== rightSeg.startPart ||
      leftSeg.duration !== rightSeg.duration
    ) {
      return false;
    }
  }
  return true;
}

function changesAgainstCurrent(
  current: PlanPatchPreviewSourcePosition,
  next: Extract<PositionPatchOp, { op: 'upsertPosition' }>
): PlanPatchPositionChange[] {
  const changes: PlanPatchPositionChange[] = [];
  const scheduleMoved =
    current.assigneeId !== next.assigneeId ||
    current.startDay !== next.startDay ||
    current.startPart !== next.startPart;
  if (scheduleMoved) {
    changes.push('schedule');
  }
  if (current.duration !== next.duration) {
    changes.push('duration');
  }
  if (next.segments !== undefined && !planPatchSegmentsEqual(current.segments, next.segments)) {
    changes.push('segments');
  }
  return changes;
}

function withUpsertExtras(
  preview: PlanPatchPositionPreview,
  op: Extract<PositionPatchOp, { op: 'upsertPosition' }>
): PlanPatchPositionPreview {
  return {
    ...preview,
    ...(op.segments !== undefined ? { segments: copySegments(op.segments) } : {}),
    ...(op.syncToTracker ? { syncToTracker: true } : {}),
  };
}

function previewForOp(
  current: PlanPatchPreviewSourcePosition | undefined,
  op: PositionPatchOp
): PlanPatchPositionPreview | null {
  if (op.op === 'deletePosition') {
    if (!current) {
      return null;
    }
    return {
      assigneeId: current.assigneeId,
      changes: [],
      duration: current.duration,
      remove: true,
      startDay: current.startDay,
      startPart: current.startPart,
      taskId: current.taskId,
      ...(current.segments ? { segments: copySegments(current.segments) } : {}),
    };
  }
  if (!current) {
    return withUpsertExtras(
      {
        assigneeId: op.assigneeId,
        changes: [],
        duration: op.duration,
        remove: false,
        startDay: op.startDay,
        startPart: op.startPart,
        taskId: op.taskId,
      },
      op
    );
  }
  const changes = changesAgainstCurrent(current, op);
  if (changes.length === 0 && !op.syncToTracker) {
    return null;
  }
  return withUpsertExtras(
    {
      assigneeId: op.assigneeId,
      changes,
      duration: op.duration,
      remove: false,
      startDay: op.startDay,
      startPart: op.startPart,
      taskId: op.taskId,
    },
    op
  );
}

/** Сравнивает итоговые position-ops с текущей доской. Последняя операция по задаче побеждает. */
export function buildPlanPatchPositionPreviews(input: {
  current: readonly PlanPatchPreviewSourcePosition[];
  ops: readonly SprintPlanPatchOp[];
}): PlanPatchPositionPreview[] {
  const currentByTask = new Map(input.current.map((position) => [position.taskId, position]));
  const previews: PlanPatchPositionPreview[] = [];
  for (const op of finalPositionOps(input.ops).values()) {
    const preview = previewForOp(currentByTask.get(op.taskId), op);
    if (preview) {
      previews.push(preview);
    }
  }
  return previews;
}

export function planPatchChangeLabelOrder(
  changes: readonly PlanPatchPositionChange[]
): PlanPatchPositionChange[] {
  const present = new Set(changes);
  const ordered: PlanPatchPositionChange[] = [];
  if (present.has('schedule')) {
    ordered.push('schedule');
  }
  if (present.has('duration')) {
    ordered.push('duration');
  }
  if (present.has('segments')) {
    ordered.push('segments');
  }
  return ordered;
}

export function joinPlanPatchChangeLabels(labels: readonly string[], andWord: string): string {
  if (labels.length <= 1) {
    return labels[0] ?? '';
  }
  if (labels.length === 2) {
    return `${labels[0]} ${andWord} ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(', ')} ${andWord} ${labels[labels.length - 1]}`;
}

export function planPatchPreviewCaptionText(
  preview: Pick<PlanPatchPositionPreview, 'changes' | 'remove'>,
  labels: PlanPatchPreviewCaptionLabels
): string {
  if (preview.remove) {
    return labels.remove;
  }
  const ordered = planPatchChangeLabelOrder(preview.changes);
  if (ordered.length === 0) {
    return labels.add;
  }
  return joinPlanPatchChangeLabels(
    ordered.map((key) => labels[key]),
    labels.and
  );
}

export function planPatchClientBrandFromUnknown(value: unknown): McpOAuthClientBrand | undefined {
  if (value === 'claude' || value === 'cursor' || value === 'generic' || value === 'openai') {
    return value;
  }
  return undefined;
}

function readChangeList(value: unknown): PlanPatchPositionChange[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const changes: PlanPatchPositionChange[] = [];
  for (const item of value) {
    if (item === 'schedule' || item === 'duration' || item === 'segments') {
      changes.push(item);
    }
  }
  return planPatchChangeLabelOrder(changes);
}

function readSegment(raw: unknown): PlanPatchPositionSegment | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  if (
    typeof row.duration !== 'number' ||
    !Number.isInteger(row.duration) ||
    row.duration <= 0 ||
    typeof row.startDay !== 'number' ||
    !Number.isInteger(row.startDay) ||
    typeof row.startPart !== 'number' ||
    !Number.isInteger(row.startPart)
  ) {
    return null;
  }
  return {
    duration: row.duration,
    startDay: row.startDay,
    startPart: row.startPart,
  };
}

function readSegments(value: unknown): PlanPatchPositionSegment[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    return undefined;
  }
  const segments: PlanPatchPositionSegment[] = [];
  for (const item of value) {
    const segment = readSegment(item);
    if (!segment) {
      return undefined;
    }
    segments.push(segment);
  }
  return segments;
}

function isPreviewGeometry(row: Record<string, unknown>): boolean {
  return (
    typeof row.taskId === 'string' &&
    row.taskId.length > 0 &&
    typeof row.assigneeId === 'string' &&
    row.assigneeId.length > 0 &&
    typeof row.duration === 'number' &&
    row.duration > 0 &&
    Number.isInteger(row.duration) &&
    typeof row.startDay === 'number' &&
    Number.isInteger(row.startDay) &&
    typeof row.startPart === 'number' &&
    Number.isInteger(row.startPart)
  );
}

export function normalizePlanPatchPositionPreview(raw: unknown): PlanPatchPositionPreview | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  if (!isPreviewGeometry(row)) {
    return null;
  }
  const clientBrand = planPatchClientBrandFromUnknown(row.clientBrand);
  const segments = readSegments(row.segments);
  return {
    assigneeId: row.assigneeId as string,
    changes: readChangeList(row.changes),
    ...(clientBrand ? { clientBrand } : {}),
    duration: row.duration as number,
    remove: row.remove === true,
    ...(segments !== undefined ? { segments } : {}),
    startDay: row.startDay as number,
    startPart: row.startPart as number,
    ...(row.syncToTracker === true ? { syncToTracker: true } : {}),
    taskId: row.taskId as string,
  };
}
