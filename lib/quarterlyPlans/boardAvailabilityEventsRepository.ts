import { query } from '@/lib/db';

interface BoardAvailabilityEventRow {
  end_date: unknown;
  event_type: string;
  id: string;
  member_id: string;
  member_name: string;
  start_date: unknown;
  tech_sprint_type: string | null;
}

export async function listBoardAvailabilityEvents(
  boardId: number,
  memberId?: string | null
): Promise<BoardAvailabilityEventRow[]> {
  const result = memberId
    ? await query(
        `SELECT id, board_id, member_id, member_name, event_type, tech_sprint_type, start_date, end_date
           FROM board_availability_events
           WHERE board_id = $1 AND member_id = $2
           ORDER BY start_date ASC, end_date ASC`,
        [boardId, memberId]
      )
    : await query(
        `SELECT id, board_id, member_id, member_name, event_type, tech_sprint_type, start_date, end_date
           FROM board_availability_events
           WHERE board_id = $1
           ORDER BY member_name ASC, start_date ASC, end_date ASC`,
        [boardId]
      );
  return result.rows as BoardAvailabilityEventRow[];
}

export async function insertBoardAvailabilityEvent(input: {
  boardId: number;
  endDate: string;
  eventType: string;
  memberId: string;
  memberName: string;
  startDate: string;
  techSprintSubtype: string | null;
}): Promise<BoardAvailabilityEventRow> {
  const insertResult = await query(
    `INSERT INTO board_availability_events (
         board_id, member_id, member_name, event_type, tech_sprint_type, start_date, end_date, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, member_id, member_name, event_type, tech_sprint_type, start_date, end_date`,
    [
      input.boardId,
      input.memberId,
      input.memberName,
      input.eventType,
      input.techSprintSubtype,
      input.startDate,
      input.endDate,
    ]
  );
  return insertResult.rows[0] as BoardAvailabilityEventRow;
}

export async function updateBoardAvailabilityEvent(input: {
  boardId: number;
  endDate: string;
  eventType: string;
  id: string;
  memberId: string;
  memberName: string;
  startDate: string;
  techSprintSubtype: string | null;
}): Promise<BoardAvailabilityEventRow | null> {
  const updateResult = await query(
    `UPDATE board_availability_events
       SET member_name = $1, event_type = $2, tech_sprint_type = $3,
           start_date = $4, end_date = $5, updated_at = NOW()
       WHERE id = $6 AND board_id = $7 AND member_id = $8
       RETURNING id, member_id, member_name, event_type, tech_sprint_type, start_date, end_date`,
    [
      input.memberName,
      input.eventType,
      input.techSprintSubtype,
      input.startDate,
      input.endDate,
      input.id,
      input.boardId,
      input.memberId,
    ]
  );
  return (updateResult.rows[0] as BoardAvailabilityEventRow | undefined) ?? null;
}

export async function deleteBoardAvailabilityEvent(
  id: string,
  boardId: number,
  memberId: string
): Promise<number> {
  const del = await query(
    `DELETE FROM board_availability_events WHERE id = $1 AND board_id = $2 AND member_id = $3`,
    [id, boardId, memberId]
  );
  return del.rowCount ?? 0;
}
