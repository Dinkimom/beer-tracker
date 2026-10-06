import type { PlanCaptureGeometry, PlanCaptureSegment } from './planAnchorCapture';

import { query } from '@/lib/db';

interface SprintPlanAnchorRecord {
  anchoredAt: string;
  assigneeId: string;
  duration: number;
  segments: PlanCaptureSegment[] | null;
  startDay: number;
  startPart: number;
  taskId: string;
}

interface CaptureRow {
  anchored_at: Date | string | null;
  assignee_id: string;
  duration: number;
  kind: string;
  segments: unknown;
  start_day: number;
  start_part: number;
  task_id: string;
}

function readSegments(value: unknown): PlanCaptureSegment[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const segments: PlanCaptureSegment[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const row = item as { duration?: unknown; startDay?: unknown; startPart?: unknown };
    if (
      typeof row.duration !== 'number' ||
      typeof row.startDay !== 'number' ||
      typeof row.startPart !== 'number'
    ) {
      return null;
    }
    segments.push({ duration: row.duration, startDay: row.startDay, startPart: row.startPart });
  }
  return segments;
}

function geometryFromRow(row: CaptureRow): PlanCaptureGeometry {
  return {
    assigneeId: row.assignee_id,
    duration: row.duration,
    segments: readSegments(row.segments),
    startDay: row.start_day,
    startPart: row.start_part,
  };
}

export async function listPlanCapturesForSprint(input: {
  organizationId: string;
  sprintId: number;
}): Promise<{ anchors: Map<string, SprintPlanAnchorRecord>; drafts: Map<string, PlanCaptureGeometry> }> {
  const result = await query<CaptureRow>(
    `SELECT task_id, kind, anchored_at, assignee_id, start_day, start_part, duration, segments
     FROM sprint_plan_captures
     WHERE organization_id = $1::uuid AND sprint_id = $2`,
    [input.organizationId, input.sprintId]
  );
  const anchors = new Map<string, SprintPlanAnchorRecord>();
  const drafts = new Map<string, PlanCaptureGeometry>();
  for (const row of result.rows) {
    if (row.kind === 'draft') {
      drafts.set(row.task_id, geometryFromRow(row));
      continue;
    }
    if (row.kind !== 'anchor' || row.anchored_at == null) continue;
    const anchoredAt =
      typeof row.anchored_at === 'string' ? row.anchored_at : row.anchored_at.toISOString();
    anchors.set(row.task_id, { ...geometryFromRow(row), anchoredAt, taskId: row.task_id });
  }
  return { anchors, drafts };
}

export async function listPlanAnchorsForSprint(input: {
  organizationId: string;
  sprintId: number;
}): Promise<SprintPlanAnchorRecord[]> {
  const { anchors } = await listPlanCapturesForSprint(input);
  return [...anchors.values()];
}

export async function upsertPlanDraft(input: {
  geometry: PlanCaptureGeometry;
  organizationId: string;
  sprintId: number;
  taskId: string;
}): Promise<void> {
  const { geometry } = input;
  await query(
    `INSERT INTO sprint_plan_captures (
       organization_id, sprint_id, task_id, kind, assignee_id, start_day, start_part, duration, segments
     )
     VALUES ($1::uuid, $2, $3, 'draft', $4, $5, $6, $7, $8::jsonb)
     ON CONFLICT (organization_id, sprint_id, task_id, kind) DO UPDATE
     SET assignee_id = EXCLUDED.assignee_id,
         start_day = EXCLUDED.start_day,
         start_part = EXCLUDED.start_part,
         duration = EXCLUDED.duration,
         segments = EXCLUDED.segments,
         captured_at = CURRENT_TIMESTAMP`,
    [
      input.organizationId,
      input.sprintId,
      input.taskId,
      geometry.assigneeId,
      geometry.startDay,
      geometry.startPart,
      geometry.duration,
      geometry.segments == null ? null : JSON.stringify(geometry.segments),
    ]
  );
}

export async function insertPlanAnchorIfAbsent(input: {
  anchoredAt: Date;
  geometry: PlanCaptureGeometry;
  organizationId: string;
  sprintId: number;
  taskId: string;
}): Promise<void> {
  const { geometry } = input;
  await query(
    `INSERT INTO sprint_plan_captures (
       organization_id, sprint_id, task_id, kind, anchored_at,
       assignee_id, start_day, start_part, duration, segments
     )
     VALUES ($1::uuid, $2, $3, 'anchor', $4, $5, $6, $7, $8, $9::jsonb)
     ON CONFLICT (organization_id, sprint_id, task_id, kind) DO NOTHING`,
    [
      input.organizationId,
      input.sprintId,
      input.taskId,
      input.anchoredAt.toISOString(),
      geometry.assigneeId,
      geometry.startDay,
      geometry.startPart,
      geometry.duration,
      geometry.segments == null ? null : JSON.stringify(geometry.segments),
    ]
  );
}
