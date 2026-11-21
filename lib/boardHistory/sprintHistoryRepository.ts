/**
 * Чтение истории спринта: события задач из `issue_field_events` и журнал доски
 * `board_object_events`. Сборка ленты — `sprintHistory.ts`.
 */

import type { BoardObjectEventRow, IssueFieldEventRow } from './sprintHistory';
import type { SprintHistoryEvent } from './sprintHistoryTypes';

import { STAFF_AUTHOR_DISPLAY_NAME_SQL } from '@/lib/comments/commentAuthor';
import { query } from '@/lib/db';
import { ISSUE_SNAPSHOT_FIELDS_JSONB_SQL } from '@/lib/snapshots/overseerIssueDataSprintSql';

import { boardObjectRowToEvent, issueFieldRowToEvent, mergeSprintHistory } from './sprintHistory';

const SPRINT_HISTORY_LIMIT = 300;

interface SprintHistoryWindow {
  organizationId: string;
  /** Не раньше: обычно начало спринта минус время на планирование. */
  since: Date | null;
  sprintId: number;
  /** Не позже: конец спринта с запасом на перенос. */
  until: Date | null;
}

/**
 * Задачи спринта — те, что добавляли в него или снимали (поле sprint в changelog), и те,
 * что лежат на доске. Их события по остальным полям берутся в окне спринта.
 */
async function listIssueFieldEvents(input: SprintHistoryWindow): Promise<IssueFieldEventRow[]> {
  const result = await query<IssueFieldEventRow>(
    `WITH sprint_issues AS (
       SELECT issue_key FROM issue_field_events
        WHERE organization_id = $1 AND field = 'sprint' AND (from_ids || to_ids) @> ARRAY[$2::text]
       UNION
       SELECT task_id FROM task_positions WHERE organization_id = $1 AND sprint_id = $3
     )
     SELECT e.issue_key, e.entry_ord, e.field_ord, e.changed_at, e.author_id, e.author_display,
            e.field, e.from_ids, e.to_ids, e.from_text, e.to_text, sn.issue_title
       FROM issue_field_events e
       JOIN sprint_issues s ON s.issue_key = e.issue_key
       LEFT JOIN LATERAL (
         SELECT ${ISSUE_SNAPSHOT_FIELDS_JSONB_SQL}->>'summary' AS issue_title
           FROM issue_snapshots
          WHERE organization_id = e.organization_id AND issue_key = e.issue_key
       ) sn ON true
      WHERE e.organization_id = $1
        AND ($4::timestamptz IS NULL OR e.changed_at >= $4)
        AND ($5::timestamptz IS NULL OR e.changed_at <= $5)
      ORDER BY e.changed_at DESC
      LIMIT ${SPRINT_HISTORY_LIMIT}`,
    [input.organizationId, String(input.sprintId), input.sprintId, input.since, input.until]
  );
  return result.rows;
}

async function listBoardObjectEvents(input: SprintHistoryWindow): Promise<BoardObjectEventRow[]> {
  const result = await query<BoardObjectEventRow>(
    `SELECT e.id, e.created_at, e.object_kind, e.object_id, e.action, e.actor_id, e.channel,
            e.client_brand, e.before, e.after, ${STAFF_AUTHOR_DISPLAY_NAME_SQL} AS actor_name
       FROM board_object_events e
       LEFT JOIN staff s ON s.id::text = e.actor_id AND s.organization_id = e.organization_id
      WHERE e.organization_id = $1 AND e.sprint_id = $2
      ORDER BY e.created_at DESC
      LIMIT ${SPRINT_HISTORY_LIMIT}`,
    [input.organizationId, input.sprintId]
  );
  return result.rows;
}

export async function loadSprintHistory(input: SprintHistoryWindow): Promise<SprintHistoryEvent[]> {
  const [issueRows, boardRows] = await Promise.all([
    listIssueFieldEvents(input),
    listBoardObjectEvents(input),
  ]);
  const issueEvents = issueRows
    .map((row) => issueFieldRowToEvent(row, input.sprintId))
    .filter((event) => event != null);
  const boardEvents = boardRows.map(boardObjectRowToEvent).filter((event) => event != null);
  return mergeSprintHistory(issueEvents, boardEvents, SPRINT_HISTORY_LIMIT);
}
