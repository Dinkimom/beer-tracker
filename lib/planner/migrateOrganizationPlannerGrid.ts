import type { PlannerTimelineScale, TimeslotsPerDay } from '@/lib/plannerTimelineScale';
import type { QueryResultRow } from 'pg';

import { pool, qualifyBeerTrackerTables, query } from '@/lib/db';
import { getBeerTrackerSchema } from '@/lib/env';
import { findOrganizationById } from '@/lib/organizations';
import {
  mergePlannerTimelineScale,
  partFitsPlannerGrid,
  readPlannerTimelineScale,
} from '@/lib/plannerTimelineScale';

interface PlannerGridMigrationPreview {
  comments: number;
  commentsShifted: number;
  positions: number;
  positionsShifted: number;
  segments: number;
  segmentsShifted: number;
}

interface CountRow extends QueryResultRow {
  shifted: number;
  total: number;
}

function scaledSlot(column: string): string {
  return `LEAST($3 - 1, GREATEST(0, ROUND(${column}::numeric * $3 / $2)::int))`;
}

function scaledDuration(column: string): string {
  return `GREATEST(1, ROUND(${column}::numeric * $3 / $2)::int)`;
}

function countSql(table: string, partColumn: string, durationColumn: string | null): string {
  const partShift = `${scaledSlot(partColumn)} * $2 IS DISTINCT FROM ${partColumn} * $3`;
  const durationShift = durationColumn
    ? ` OR ${scaledDuration(durationColumn)} * $2 IS DISTINCT FROM ${durationColumn} * $3`
    : '';
  const partGuard = partColumn === 'part' ? ' AND part IS NOT NULL' : '';
  return `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE ${partShift}${durationShift})::int AS shifted
     FROM ${table}
     WHERE organization_id = $1${partGuard}`;
}

async function countGridRows(
  organizationId: string,
  from: TimeslotsPerDay,
  to: TimeslotsPerDay,
  table: string,
  partColumn: string,
  durationColumn: string | null
): Promise<CountRow> {
  const result = await query<CountRow>(countSql(table, partColumn, durationColumn), [
    organizationId,
    from,
    to,
  ]);
  return result.rows[0] ?? { shifted: 0, total: 0 };
}

export async function previewPlannerGridMigration(
  organizationId: string,
  from: TimeslotsPerDay,
  to: TimeslotsPerDay
): Promise<PlannerGridMigrationPreview> {
  const [positions, segments, comments] = await Promise.all([
    countGridRows(organizationId, from, to, 'task_positions', 'start_part', 'duration'),
    countGridRows(organizationId, from, to, 'task_position_segments', 'start_part', 'duration'),
    countGridRows(organizationId, from, to, 'comments', 'part', null),
  ]);
  return {
    comments: comments.total,
    commentsShifted: comments.shifted,
    positions: positions.total,
    positionsShifted: positions.shifted,
    segments: segments.total,
    segmentsShifted: segments.shifted,
  };
}

export function plannerGridPreviewHasRows(preview: PlannerGridMigrationPreview): boolean {
  return preview.positions + preview.segments + preview.comments > 0;
}

function plannerSchemaIdent(): string {
  const schema = getBeerTrackerSchema();
  if (!/^[A-Za-z_]\w*$/.test(schema)) {
    throw new Error('Invalid database schema name');
  }
  return schema;
}

function widenPartCheckStatements(): string[] {
  const schema = plannerSchemaIdent();
  return [
    `DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname AS table_name, con.conname
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = '${schema}'
      AND c.relname IN ('task_positions', 'task_position_segments', 'comments')
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%part%'
      AND pg_get_constraintdef(con.oid) LIKE '%< 3%'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', '${schema}', r.table_name, r.conname);
  END LOOP;
END $$`,
    `ALTER TABLE task_positions DROP CONSTRAINT IF EXISTS task_positions_start_part_check`,
    `ALTER TABLE task_positions ADD CONSTRAINT task_positions_start_part_check
      CHECK (start_part >= 0 AND start_part < 4)`,
    `ALTER TABLE task_positions DROP CONSTRAINT IF EXISTS task_positions_planned_start_part_check`,
    `ALTER TABLE task_positions ADD CONSTRAINT task_positions_planned_start_part_check
      CHECK (planned_start_part IS NULL OR (planned_start_part >= 0 AND planned_start_part < 4))`,
    `ALTER TABLE task_position_segments DROP CONSTRAINT IF EXISTS task_position_segments_start_part_check`,
    `ALTER TABLE task_position_segments ADD CONSTRAINT task_position_segments_start_part_check
      CHECK (start_part >= 0 AND start_part < 4)`,
    `ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_part_check`,
    `ALTER TABLE comments ADD CONSTRAINT comments_part_check
      CHECK (part IS NULL OR (part >= 0 AND part < 4))`,
  ];
}

function positionUpdateSql(): string {
  return `UPDATE task_positions
     SET start_part = ${scaledSlot('start_part')},
         duration = ${scaledDuration('duration')},
         planned_start_part = CASE
           WHEN planned_start_part IS NULL THEN NULL
           ELSE ${scaledSlot('planned_start_part')}
         END,
         planned_duration = CASE
           WHEN planned_duration IS NULL THEN NULL
           ELSE ${scaledDuration('planned_duration')}
         END,
         updated_at = CURRENT_TIMESTAMP
     WHERE organization_id = $1`;
}

export async function applyPlannerTimelineScale(
  organizationId: string,
  settingsRoot: unknown,
  next: PlannerTimelineScale,
  from: TimeslotsPerDay
): Promise<void> {
  const settings = mergePlannerTimelineScale(settingsRoot, next);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const run = (sql: string, params?: unknown[]) =>
      client.query(qualifyBeerTrackerTables(sql), params);
    if (from !== next.timeslotsPerDay) {
      for (const statement of widenPartCheckStatements()) {
        await run(statement);
      }
      await run(positionUpdateSql(), [organizationId, from, next.timeslotsPerDay]);
      await run(
        `UPDATE task_position_segments
         SET start_part = ${scaledSlot('start_part')},
             duration = ${scaledDuration('duration')}
         WHERE organization_id = $1`,
        [organizationId, from, next.timeslotsPerDay]
      );
      await run(
        `UPDATE comments
         SET part = ${scaledSlot('part')}
         WHERE organization_id = $1 AND part IS NOT NULL`,
        [organizationId, from, next.timeslotsPerDay]
      );
    }
    await run(
      `UPDATE organizations
       SET settings = $2::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [organizationId, JSON.stringify(settings)]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function plannerGridPartError(
  organizationId: string,
  parts: Array<number | null | undefined>
): Promise<string | null> {
  if (parts.every((part) => part == null)) return null;
  const org = await findOrganizationById(organizationId);
  if (!org) return null;
  const scale = readPlannerTimelineScale(org.settings);
  const overflow = parts.some((part) => !partFitsPlannerGrid(part, scale));
  if (!overflow) return null;
  return `Day part must be less than ${scale.timeslotsPerDay}`;
}
