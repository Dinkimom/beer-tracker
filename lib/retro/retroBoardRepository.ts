import type { RetroBoard } from './retroBoardShared';

import { query } from '@/lib/db';

import { mergeRetroBoards } from './retroBoardMerge';
import { parseRetroBoard } from './retroBoardParse';

const SAVE_ATTEMPTS = 3;

export function readRetroSavePayload(raw: unknown): { base: unknown | null; board: unknown } {
  if (raw !== null && typeof raw === 'object' && 'board' in raw && 'base' in raw) {
    return { base: raw.base ?? null, board: raw.board };
  }
  return { base: null, board: raw };
}

export async function fetchRetroBoard(input: {
  organizationId: string;
  sprintId: number;
}): Promise<RetroBoard | null> {
  const result = await query<{ board: unknown }>(
    `SELECT board FROM retro_boards WHERE organization_id = $1 AND sprint_id = $2`,
    [input.organizationId, input.sprintId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return parseRetroBoard(row.board, input.sprintId);
}

export async function upsertRetroBoard(input: {
  base?: unknown | null;
  board: unknown;
  organizationId: string;
  sprintId: number;
}): Promise<RetroBoard | null> {
  const incoming = parseRetroBoard(input.board, input.sprintId);
  if (!incoming) return null;
  const base = input.base == null ? null : parseRetroBoard(input.base, input.sprintId);
  for (let attempt = 0; attempt < SAVE_ATTEMPTS; attempt += 1) {
    const saved = await writeMergedRetroBoard({
      base,
      incoming,
      organizationId: input.organizationId,
      sprintId: input.sprintId,
    });
    if (saved) return saved;
  }
  return null;
}

async function fetchRetroBoardRow(input: {
  organizationId: string;
  sprintId: number;
}): Promise<{ board: RetroBoard; updatedAt: string } | null> {
  const result = await query<{ board: unknown; updated_at: string }>(
    `SELECT board, updated_at::text AS updated_at FROM retro_boards WHERE organization_id = $1 AND sprint_id = $2`,
    [input.organizationId, input.sprintId]
  );
  const row = result.rows[0];
  if (!row) return null;
  const board = parseRetroBoard(row.board, input.sprintId);
  if (!board) return null;
  return { board, updatedAt: row.updated_at };
}

async function insertRetroBoard(input: {
  board: RetroBoard;
  organizationId: string;
  sprintId: number;
}): Promise<RetroBoard | null> {
  const result = await query(
    `INSERT INTO retro_boards (organization_id, sprint_id, board)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (organization_id, sprint_id) DO NOTHING
     RETURNING board`,
    [input.organizationId, input.sprintId, JSON.stringify(input.board)]
  );
  return result.rows[0] ? input.board : null;
}

async function writeMergedRetroBoard(input: {
  base: RetroBoard | null;
  incoming: RetroBoard;
  organizationId: string;
  sprintId: number;
}): Promise<RetroBoard | null> {
  const row = await fetchRetroBoardRow(input);
  if (!row) {
    return insertRetroBoard({
      board: input.incoming,
      organizationId: input.organizationId,
      sprintId: input.sprintId,
    });
  }
  const merged = input.base ? mergeRetroBoards(input.base, row.board, input.incoming) : input.incoming;
  const result = await query(
    `UPDATE retro_boards SET board = $3::jsonb, updated_at = CURRENT_TIMESTAMP
     WHERE organization_id = $1 AND sprint_id = $2 AND updated_at = $4::timestamptz
     RETURNING board`,
    [input.organizationId, input.sprintId, JSON.stringify(merged), row.updatedAt]
  );
  return result.rows[0] ? merged : null;
}
