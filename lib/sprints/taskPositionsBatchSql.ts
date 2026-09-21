function taskPositionsDeleteWhere(placeholders: string): string {
  return `sprint_id = $1 AND task_id IN (${placeholders})`;
}

export function buildTaskPositionsBatchDeleteSql(placeholders: string): string {
  return `DELETE FROM task_positions WHERE ${taskPositionsDeleteWhere(placeholders)}`;
}

/** PK beer_tracker.task_positions: (organization_id, sprint_id, task_id). */
const TASK_POSITIONS_ON_CONFLICT_SQL = `ON CONFLICT (organization_id, sprint_id, task_id)
             DO UPDATE SET
               assignee_id = EXCLUDED.assignee_id,
               start_day = EXCLUDED.start_day,
               start_part = EXCLUDED.start_part,
               duration = EXCLUDED.duration,
               planned_start_day = EXCLUDED.planned_start_day,
               planned_start_part = EXCLUDED.planned_start_part,
               planned_duration = EXCLUDED.planned_duration,
               is_qa = EXCLUDED.is_qa,
               updated_at = CURRENT_TIMESTAMP`;

const TASK_POSITIONS_INSERT_COLUMNS = `organization_id, sprint_id, task_id, assignee_id, start_day, start_part, duration,
               planned_start_day, planned_start_part, planned_duration, is_qa`;

export function buildTaskPositionsUpsertSql(): string {
  return `INSERT INTO task_positions (
           ${TASK_POSITIONS_INSERT_COLUMNS}
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ${TASK_POSITIONS_ON_CONFLICT_SQL}
         RETURNING *`;
}

export function buildTaskPositionSegmentUpsertSql(): string {
  return `INSERT INTO task_position_segments (organization_id, sprint_id, task_id, segment_index, start_day, start_part, duration)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (organization_id, sprint_id, task_id, segment_index)
         DO UPDATE SET
           start_day = EXCLUDED.start_day,
           start_part = EXCLUDED.start_part,
           duration = EXCLUDED.duration`;
}

export function buildTaskPositionsBatchInsertSql(valuesClause: string): string {
  return `INSERT INTO task_positions (${TASK_POSITIONS_INSERT_COLUMNS})
             VALUES ${valuesClause}
             ${TASK_POSITIONS_ON_CONFLICT_SQL}`;
}
