import { runBeerTrackerTransaction } from '@/lib/db';

import {
  deleteSprintCommentLinksSql,
  moveSprintCommentsSql,
  sprintCommentLinkEndpoints,
} from './sprintCommentsRepository';

/**
 * Стрелки к заметке переносим тем же UPDATE, если в целевом спринте ещё нет
 * такой же пары (unique по sprint/from/to). $3 — концы: `comment:{uuid}` и сырой uuid.
 */
export function moveSprintCommentLinksSql(): string {
  return `UPDATE task_links AS l SET sprint_id = $2
    WHERE l.sprint_id = $1
      AND (l.from_task_id = ANY($3::text[]) OR l.to_task_id = ANY($3::text[]))
      AND NOT EXISTS (
        SELECT 1 FROM task_links AS d
         WHERE d.sprint_id = $2
           AND d.from_task_id = l.from_task_id
           AND d.to_task_id = l.to_task_id
      )`;
}


/**
 * Переносит заметки в другой спринт вместе с привязанными к ним стрелками, одной транзакцией.
 * Возвращает число реально перенесённых заметок (0 — ни одной не нашлось в исходном спринте).
 */
export async function moveSprintCommentsToSprint(input: {
  commentIds: string[];
  fromSprintId: number;
  organizationId: string;
  toSprintId: number;
}): Promise<number> {
  if (input.commentIds.length === 0 || input.fromSprintId === input.toSprintId) {
    return 0;
  }
  return await runBeerTrackerTransaction(async (tx) => {
    const moved = await tx(`${moveSprintCommentsSql()} RETURNING id`, [
      input.fromSprintId,
      input.toSprintId,
      input.commentIds,
    ]);
    const movedIds = (moved.rows as Array<{ id: string }>).map((row) => String(row.id));
    if (movedIds.length === 0) {
      return 0;
    }
    const endpoints = sprintCommentLinkEndpoints(movedIds);
    await tx(moveSprintCommentLinksSql(), [input.fromSprintId, input.toSprintId, endpoints]);
    // Что не переехало из-за дубля в целевом спринте, в исходном висит уже без заметки.
    await tx(deleteSprintCommentLinksSql(), [input.fromSprintId, endpoints]);
    return movedIds.length;
  });
}
