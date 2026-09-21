import type { BatchPositionsSchema } from '@/lib/validation';
import type { z } from 'zod';

import { query } from '@/lib/db';

import {
  buildTaskPositionsBatchDeleteSql,
  buildTaskPositionsBatchInsertSql,
} from './taskPositionsBatchSql';
import { replaceTaskPositionSegments } from './taskPositionsRepository';

type BatchPosition = z.infer<typeof BatchPositionsSchema>['positions'][number];

const BATCH_INSERT_PARAMS_PER_ROW = 11;

type BatchPositionSqlParam = boolean | number | string | null;

function pushBatchPositionParams(
  params: BatchPositionSqlParam[],
  organizationId: string,
  sprintId: number,
  pos: BatchPosition
): void {
  params.push(
    organizationId,
    sprintId,
    pos.taskId,
    pos.assigneeId,
    pos.startDay,
    pos.startPart,
    pos.duration,
    pos.plannedStartDay ?? null,
    pos.plannedStartPart ?? null,
    pos.plannedDuration ?? null,
    pos.isQa ?? false
  );
}

function buildBatchInsertValues(
  positions: BatchPosition[],
  organizationId: string,
  sprintId: number
): { params: BatchPositionSqlParam[]; valuesParts: string[] } {
  const valuesParts: string[] = [];
  const params: BatchPositionSqlParam[] = [];

  positions.forEach((pos, index) => {
    const baseIndex = index * BATCH_INSERT_PARAMS_PER_ROW + 1;
    const placeholders = Array.from({ length: BATCH_INSERT_PARAMS_PER_ROW }, (_, i) => `$${baseIndex + i}`).join(
      ', '
    );
    valuesParts.push(`(${placeholders})`);
    pushBatchPositionParams(params, organizationId, sprintId, pos);
  });

  return { params, valuesParts };
}

async function deleteExistingBatchPositions(input: {
  positions: BatchPosition[];
  sprintId: number;
}): Promise<void> {
  const taskIds = input.positions.map((p) => p.taskId);
  if (taskIds.length === 0) {
    return;
  }
  const placeholders = taskIds.map((_, i) => `$${i + 2}`).join(', ');
  await query(buildTaskPositionsBatchDeleteSql(placeholders), [input.sprintId, ...taskIds]);
}

async function insertBatchPositions(input: {
  organizationId: string;
  positions: BatchPosition[];
  sprintId: number;
}): Promise<void> {
  const { params, valuesParts } = buildBatchInsertValues(
    input.positions,
    input.organizationId,
    input.sprintId
  );
  await query(buildTaskPositionsBatchInsertSql(valuesParts.join(', ')), params);
}

export async function persistBatchPositionsTransaction(input: {
  organizationId: string;
  positions: BatchPosition[];
  sprintId: number;
}): Promise<void> {
  await query('BEGIN');
  try {
    await deleteExistingBatchPositions(input);
    await insertBatchPositions(input);
    for (const pos of input.positions) {
      await replaceTaskPositionSegments({
        organizationId: input.organizationId,
        segments: pos.segments,
        sprintId: input.sprintId,
        taskId: pos.taskId,
      });
    }
    await query('COMMIT');
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
}

type PositionRow = Record<string, unknown> & { sprint_id: number; task_id: string };

interface SegmentRow {
  duration: number;
  segment_index: number;
  sprint_id: number;
  start_day: number;
  start_part: number;
  task_id: string;
}

function buildBatchPositionsSelectQuery(): string {
  return `SELECT 
        sprint_id,
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
      WHERE sprint_id = ANY($1::int[])
      ORDER BY sprint_id, assignee_id, start_day, start_part`;
}

function buildBatchPositionSegmentsSelectQuery(): string {
  return `SELECT sprint_id, task_id, segment_index, start_day, start_part, duration
         FROM task_position_segments
         WHERE sprint_id = ANY($1::int[])
         ORDER BY sprint_id, task_id, segment_index`;
}

function groupBatchPositionRows(
  sprintIds: number[],
  rows: PositionRow[]
): Record<number, Array<Record<string, unknown>>> {
  const bySprint: Record<number, Array<Record<string, unknown>>> = {};
  for (const id of sprintIds) {
    bySprint[id] = [];
  }
  for (const row of rows) {
    const { sprint_id, ...rest } = row;
    if (!bySprint[sprint_id]) {
      bySprint[sprint_id] = [];
    }
    bySprint[sprint_id].push(rest);
  }
  return bySprint;
}

function indexPositionSegmentsBySprintAndTask(rows: SegmentRow[]): Map<
  string,
  Array<{ duration: number; start_day: number; start_part: number }>
> {
  const segmentsBySprintAndTask = new Map<
    string,
    Array<{ duration: number; start_day: number; start_part: number }>
  >();
  for (const row of rows) {
    const key = `${row.sprint_id}:${row.task_id}`;
    const list = segmentsBySprintAndTask.get(key) ?? [];
    list.push({ start_day: row.start_day, start_part: row.start_part, duration: row.duration });
    segmentsBySprintAndTask.set(key, list);
  }
  return segmentsBySprintAndTask;
}

function attachSegmentsToBatchPositions(
  sprintIds: number[],
  bySprint: Record<number, Array<Record<string, unknown>>>,
  segmentsBySprintAndTask: Map<string, Array<{ duration: number; start_day: number; start_part: number }>>
): void {
  for (const sprintId of sprintIds) {
    for (const pos of bySprint[sprintId] ?? []) {
      const taskId = pos.task_id as string;
      pos.segments = segmentsBySprintAndTask.get(`${sprintId}:${taskId}`);
    }
  }
}

export async function fetchBatchPositionsWithSegments(args: {
  organizationId: string;
  sprintIds: number[];
}): Promise<Record<number, Array<Record<string, unknown>>>> {
  const queryParams = [args.sprintIds];

  const result = await query(buildBatchPositionsSelectQuery(), queryParams);
  const bySprint = groupBatchPositionRows(args.sprintIds, result.rows as PositionRow[]);

  if (args.sprintIds.length === 0) {
    return bySprint;
  }

  const segmentsResult = await query(buildBatchPositionSegmentsSelectQuery(), queryParams);
  const segmentsBySprintAndTask = indexPositionSegmentsBySprintAndTask(
    segmentsResult.rows as SegmentRow[]
  );
  attachSegmentsToBatchPositions(args.sprintIds, bySprint, segmentsBySprintAndTask);
  return bySprint;
}

export function buildBatchPositionsResponse(
  sprintIds: number[],
  bySprint: Record<number, Array<Record<string, unknown>>>
): { bySprint: Array<{ positions: Array<Record<string, unknown>>; sprintId: number }> } {
  return {
    bySprint: sprintIds.map((id) => ({ sprintId: id, positions: bySprint[id] ?? [] })),
  };
}
