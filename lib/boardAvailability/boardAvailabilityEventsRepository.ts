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

/**
 * События отсутствия доски организации. Номер доски уникален только внутри организации,
 * поэтому каждый запрос — по паре (организация, доска).
 */
export async function listBoardAvailabilityEvents(
  organizationId: string,
  boardId: number,
  memberId?: string | null
): Promise<BoardAvailabilityEventRow[]> {
  const result = memberId
    ? await query(
        `SELECT id, board_id, member_id, member_name, event_type, start_date, end_date
           FROM board_availability_events
           WHERE organization_id = $1 AND board_id = $2 AND member_id = $3
           ORDER BY start_date ASC, end_date ASC`,
        [organizationId, boardId, memberId]
      )
    : await query(
        `SELECT id, board_id, member_id, member_name, event_type, start_date, end_date
           FROM board_availability_events
           WHERE organization_id = $1 AND board_id = $2
           ORDER BY member_name ASC, start_date ASC, end_date ASC`,
        [organizationId, boardId]
      );
  return result.rows as BoardAvailabilityEventRow[];
}

export async function insertBoardAvailabilityEvent(input: {
  boardId: number;
  organizationId: string;
  endDate: string;
  eventType: string;
  memberId: string;
  memberName: string;
  startDate: string;
}): Promise<BoardAvailabilityEventRow> {
  const insertResult = await query(
    `INSERT INTO board_availability_events (
         board_id, member_id, member_name, event_type, start_date, end_date, organization_id, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, member_id, member_name, event_type, start_date, end_date`,
    [
      input.boardId,
      input.memberId,
      input.memberName,
      input.eventType,
      input.startDate,
      input.endDate,
      input.organizationId,
    ]
  );
  return insertResult.rows[0] as BoardAvailabilityEventRow;
}

export async function updateBoardAvailabilityEvent(input: {
  boardId: number;
  organizationId: string;
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
       WHERE id = $5 AND board_id = $6 AND member_id = $7 AND organization_id = $8
       RETURNING id, member_id, member_name, event_type, start_date, end_date`,
    [
      input.memberName,
      input.eventType,
      input.startDate,
      input.endDate,
      input.id,
      input.boardId,
      input.memberId,
      input.organizationId,
    ]
  );
  return (updateResult.rows[0] as BoardAvailabilityEventRow | undefined) ?? null;
}

export async function deleteBoardAvailabilityEvent(
  organizationId: string,
  id: string,
  boardId: number,
  memberId: string
): Promise<number> {
  const del = await query(
    `DELETE FROM board_availability_events
      WHERE id = $1 AND board_id = $2 AND member_id = $3 AND organization_id = $4`,
    [id, boardId, memberId, organizationId]
  );
  return del.rowCount ?? 0;
}
