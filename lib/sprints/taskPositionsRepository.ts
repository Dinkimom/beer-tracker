import type { BeerTrackerTransactionQuery } from '@/lib/db';
import type { QueryParams } from '@/types';

import { query } from '@/lib/db';

import {
  buildSprintTaskIdsScopeQuery,
  sprintTenantParams,
  sprintTenantWhere,
} from './sprintTenantSql';
import {
  buildTaskPositionSegmentUpsertSql,
  buildTaskPositionsUpsertSql,
} from './taskPositionsBatchSql';

export interface TaskPositionSegmentInput {
  duration: number;
  startDay: number;
  startPart: number;
}

type TaskPositionRow = Record<string, unknown> & { task_id: string };

export interface PersistedPositionForSync {
  duration: number;
  plannedDuration?: number | null;
  plannedStartDay?: number | null;
  plannedStartPart?: number | null;
  segments?: Array<{ duration: number; startDay: number; startPart: number }>;
  taskId: string;
}

export async function listTaskPositionsForSprint(input: {
  organizationId: string;
  sprintId: number;
}): Promise<TaskPositionRow[]> {
  const result = await query(
    `SELECT
        task_id,
        assignee_id,
        start_day,
        start_part,
        duration,
        planned_start_day,
        planned_start_part,
        planned_duration,
        is_qa
      FROM task_positions
      WHERE ${sprintTenantWhere()}
      ORDER BY assignee_id, start_day, start_part`,
    sprintTenantParams(input.sprintId)
  );
  return result.rows as TaskPositionRow[];
}

/** Спринты, на досках которых у задачи есть карточка, — для переноса задачи агентом (K8). */
export async function listTaskPositionSprintIds(input: { organizationId: string; taskId: string }): Promise<number[]> {
  const result = await query<{ sprint_id: number }>(
    'SELECT DISTINCT sprint_id FROM task_positions WHERE organization_id = $1 AND task_id = $2',
    [input.organizationId, input.taskId]
  );
  return result.rows.map((row) => Number(row.sprint_id));
}

/** Карточки задач `taskIds` на досках спринтов `sprintIds` вместе с их отрезками — для квартального плана (QK8). */
export async function listTaskCardSpans(input: {
  sprintIds: readonly number[];
  taskIds: readonly string[];
}): Promise<
  Array<{
    duration: number;
    segments: Array<{ duration: number; startDay: number; startPart: number }> | null;
    sprintId: number;
    startDay: number;
    startPart: number;
    taskId: string;
  }>
> {
  if (input.sprintIds.length === 0 || input.taskIds.length === 0) return [];
  const result = await query(
    `SELECT p.sprint_id AS "sprintId", p.task_id AS "taskId", p.start_day AS "startDay",
            p.start_part AS "startPart", p.duration, s.segments
       FROM task_positions p
       LEFT JOIN LATERAL (
         SELECT json_agg(json_build_object('startDay', seg.start_day, 'startPart', seg.start_part, 'duration', seg.duration)) AS segments
           FROM task_position_segments seg
          WHERE seg.sprint_id = p.sprint_id AND seg.task_id = p.task_id
       ) s ON TRUE
      WHERE p.sprint_id = ANY($1::int[]) AND p.task_id = ANY($2::text[])`,
    [[...input.sprintIds], [...input.taskIds]]
  );
  return result.rows;
}

export async function loadPositionSegmentsByTask(
  sprintId: number
): Promise<Map<string, Array<{ segment_index: number; start_day: number; start_part: number; duration: number }>>> {
  const segmentsResult = await query(
    `SELECT task_id, segment_index, start_day, start_part, duration
     FROM task_position_segments
     WHERE ${sprintTenantWhere()}
     ORDER BY task_id, segment_index`,
    sprintTenantParams(sprintId)
  );
  const segmentsByTask = new Map<
    string,
    Array<{ segment_index: number; start_day: number; start_part: number; duration: number }>
  >();
  for (const row of segmentsResult.rows as Array<{
    task_id: string;
    segment_index: number;
    start_day: number;
    start_part: number;
    duration: number;
  }>) {
    const list = segmentsByTask.get(row.task_id) ?? [];
    list.push({
      segment_index: row.segment_index,
      start_day: row.start_day,
      start_part: row.start_part,
      duration: row.duration,
    });
    segmentsByTask.set(row.task_id, list);
  }
  return segmentsByTask;
}

export function attachSegmentsToPositions(
  positions: TaskPositionRow[],
  segmentsByTask: Map<string, Array<{ segment_index: number; start_day: number; start_part: number; duration: number }>>
): void {
  for (const pos of positions) {
    const segs = segmentsByTask.get(pos.task_id);
    (pos as Record<string, unknown>).segments = segs
      ? segs
          .sort((a, b) => a.segment_index - b.segment_index)
          .map(({ start_day, start_part, duration }) => ({ start_day, start_part, duration }))
      : undefined;
  }
}

export function upsertTaskPositionRecord(
  input: {
    assigneeId: string;
    duration: number;
    isQa: boolean | undefined;
    organizationId: string;
    plannedDuration: number | null | undefined;
    plannedStartDay: number | null | undefined;
    plannedStartPart: number | null | undefined;
    sprintId: number;
    startDay: number;
    startPart: number;
    taskId: string;
  },
  run: BeerTrackerTransactionQuery = query
): Promise<{ rows: unknown[] }> {
  const {
    organizationId,
    sprintId,
    taskId,
    assigneeId,
    startDay,
    startPart,
    duration,
    plannedStartDay,
    plannedStartPart,
    plannedDuration,
    isQa,
  } = input;

  return run(buildTaskPositionsUpsertSql(), [
    organizationId,
    sprintId,
    taskId,
    assigneeId,
    startDay,
    startPart,
    duration,
    plannedStartDay ?? null,
    plannedStartPart ?? null,
    plannedDuration ?? null,
    isQa ?? false,
  ]);
}

/** Исполнитель запроса: пул по умолчанию или `tx` из `runBeerTrackerTransaction`. */
type SegmentsQuery = (sql: string, params?: QueryParams) => Promise<unknown>;

async function insertPositionSegment(input: {
  index: number;
  organizationId: string;
  run: SegmentsQuery;
  segment: TaskPositionSegmentInput;
  sprintId: number;
  taskId: string;
}): Promise<void> {
  const { organizationId, sprintId, taskId, index, segment } = input;
  await input.run(buildTaskPositionSegmentUpsertSql(), [
    organizationId,
    sprintId,
    taskId,
    index,
    segment.startDay,
    segment.startPart,
    segment.duration,
  ]);
}

export async function replaceTaskPositionSegments(
  input: {
    organizationId: string;
    segments: TaskPositionSegmentInput[] | undefined;
    sprintId: number;
    taskId: string;
  },
  run: SegmentsQuery = query
): Promise<void> {
  const { organizationId, sprintId, taskId, segments } = input;
  if (segments === undefined) {
    return;
  }

  await run('DELETE FROM task_position_segments WHERE sprint_id = $1 AND task_id = $2', [
    sprintId,
    taskId,
  ]);

  for (let i = 0; i < segments.length; i++) {
    await insertPositionSegment({
      index: i,
      organizationId,
      run,
      segment: segments[i]!,
      sprintId,
      taskId,
    });
  }
}

export function updateTaskPositionRecord(input: {
  assigneeId: unknown;
  duration: unknown;
  organizationId: string;
  plannedDuration: unknown;
  plannedStartDay: unknown;
  plannedStartPart: unknown;
  sprintId: number;
  startDay: unknown;
  startPart: unknown;
  taskId: string;
}): Promise<{ rows: Array<Record<string, unknown> & { is_qa?: boolean }> }> {
  const {
    assigneeId,
    startDay,
    startPart,
    duration,
    plannedStartDay,
    plannedStartPart,
    plannedDuration,
    sprintId,
    taskId,
  } = input;

  return query(
    `UPDATE task_positions SET
      assignee_id = COALESCE($1, assignee_id),
      start_day = COALESCE($2, start_day),
      start_part = COALESCE($3, start_part),
      duration = COALESCE($4, duration),
      planned_start_day = $5,
      planned_start_part = $6,
      planned_duration = $7,
      updated_at = CURRENT_TIMESTAMP
    WHERE sprint_id = $8 AND task_id = $9
    RETURNING *`,
    [
      assigneeId,
      startDay,
      startPart,
      duration,
      plannedStartDay,
      plannedStartPart,
      plannedDuration,
      sprintId,
      taskId,
    ] as QueryParams
  );
}

export async function deleteTaskPosition(
  input: {
    organizationId: string;
    sprintId: number;
    taskId: string;
  },
  run: BeerTrackerTransactionQuery = query
): Promise<void> {
  await run('DELETE FROM task_positions WHERE sprint_id = $1 AND task_id = $2', [
    input.sprintId,
    input.taskId,
  ]);
}

/** Удаляет все позиции спринта; возвращает task_id снятых dev-карточек (без QA). */
export async function clearTaskPositionsForSprint(input: {
  organizationId: string;
  sprintId: number;
}): Promise<string[]> {
  const result = await query(
    'DELETE FROM task_positions WHERE sprint_id = $1 RETURNING task_id, is_qa',
    [input.sprintId]
  );
  return (result.rows as Array<{ is_qa: boolean | null; task_id: string }>)
    .filter((row) => row.is_qa !== true)
    .map((row) => row.task_id);
}

export async function loadPersistedPositionsForPlannedSync(
  sprintId: number,
  taskIds: string[]
): Promise<Map<string, PersistedPositionForSync>> {
  if (taskIds.length === 0) {
    return new Map();
  }

  const { params, scopeSql } = buildSprintTaskIdsScopeQuery(sprintId, taskIds);

  const positionsResult = await query(
    `SELECT task_id, duration, planned_start_day, planned_start_part, planned_duration
     FROM task_positions
     WHERE ${scopeSql}`,
    params
  );

  const positions = new Map<string, PersistedPositionForSync>();
  for (const row of positionsResult.rows as Array<{
    duration: number;
    planned_duration: number | null;
    planned_start_day: number | null;
    planned_start_part: number | null;
    task_id: string;
  }>) {
    positions.set(row.task_id, {
      duration: row.duration,
      plannedDuration: row.planned_duration,
      plannedStartDay: row.planned_start_day,
      plannedStartPart: row.planned_start_part,
      taskId: row.task_id,
    });
  }

  if (positions.size === 0) {
    return positions;
  }

  const segmentsResult = await query(
    `SELECT task_id, start_day, start_part, duration
     FROM task_position_segments
     WHERE ${scopeSql}
     ORDER BY task_id, segment_index`,
    params
  );

  for (const row of segmentsResult.rows as Array<{
    duration: number;
    start_day: number;
    start_part: number;
    task_id: string;
  }>) {
    const position = positions.get(row.task_id);
    if (!position) {
      continue;
    }
    position.segments = [
      ...(position.segments ?? []),
      { duration: row.duration, startDay: row.start_day, startPart: row.start_part },
    ];
  }

  return positions;
}

export async function getTaskPositionAssigneeId(input: {
  organizationId: string;
  sprintId: number;
  taskId: string;
}): Promise<string | null> {
  const result = await query<{ assignee_id: string }>(
    `SELECT assignee_id
     FROM task_positions
     WHERE ${sprintTenantWhere()}
       AND task_id = $2`,
    [...sprintTenantParams(input.sprintId), input.taskId]
  );
  return result.rows[0]?.assignee_id ?? null;
}
