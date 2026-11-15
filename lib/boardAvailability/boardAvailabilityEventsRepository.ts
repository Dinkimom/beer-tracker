import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { query } from '@/lib/db';

interface BoardAvailabilityEventRow {
  end_date: unknown;
  event_type: string;
  id: string;
  member_id: string;
  member_name: string;
  start_date: unknown;
}

function toIsoDateOnly(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/** Строка таблицы → событие доступности, как его видит клиент. */
export function boardAvailabilityEventFromRow(row: BoardAvailabilityEventRow): BoardAvailabilityEvent {
  return {
    endDate: toIsoDateOnly(row.end_date),
    eventType: row.event_type as BoardAvailabilityEvent['eventType'],
    id: row.id,
    memberId: row.member_id,
    memberName: row.member_name,
    startDate: toIsoDateOnly(row.start_date),
  };
}

export async function listBoardAvailabilityEvents(
  boardId: number,
  memberId?: string | null
): Promise<BoardAvailabilityEventRow[]> {
  const result = memberId
    ? await query(
        `SELECT id, board_id, member_id, member_name, event_type, start_date, end_date
           FROM board_availability_events
           WHERE board_id = $1 AND member_id = $2
           ORDER BY start_date ASC, end_date ASC`,
        [boardId, memberId]
      )
    : await query(
        `SELECT id, board_id, member_id, member_name, event_type, start_date, end_date
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
}): Promise<BoardAvailabilityEventRow> {
  const insertResult = await query(
    `INSERT INTO board_availability_events (
         board_id, member_id, member_name, event_type, start_date, end_date, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, member_id, member_name, event_type, start_date, end_date`,
    [
      input.boardId,
      input.memberId,
      input.memberName,
      input.eventType,
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
}): Promise<BoardAvailabilityEventRow | null> {
  const updateResult = await query(
    `UPDATE board_availability_events
       SET member_name = $1, event_type = $2,
           start_date = $3, end_date = $4, updated_at = NOW()
       WHERE id = $5 AND board_id = $6 AND member_id = $7
       RETURNING id, member_id, member_name, event_type, start_date, end_date`,
    [
      input.memberName,
      input.eventType,
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
