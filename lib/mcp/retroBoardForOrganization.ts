import type { AgentReactionView } from '@/lib/comments/stickyNoteReaction';
import type { RetroBoardOp } from '@/lib/mcp/retroBoardOps';
import type { RetroBoard, RetroColumnPreset } from '@/lib/retro/retroBoardShared';

import { groupReactionsForAgent } from '@/lib/comments/stickyNoteReaction';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import {
  addRetroCardComment,
  addRetroColumn,
  addRetroNote,
  convertRetroNote,
  deleteRetroCard,
  deleteRetroCardComment,
  deleteRetroColumn,
  moveRetroCard,
  moveRetroColumn,
  renameRetroColumn,
  resolveRetroBoard,
  retroStoreFromBoards,
  updateRetroCardText,
} from '@/lib/retro/retroBoard';
import { fetchRetroBoard, upsertRetroBoard } from '@/lib/retro/retroBoardRepository';
import { readRetroColumnTemplate } from '@/lib/retro/retroColumnTemplateRepository';

interface McpRetroBoardView {
  cards: Array<{
    /** Кто завёл карточку; у старых карточек — нет. */
    authorName?: string;
    cardId: string;
    columnId: string;
    comments: Array<{ authorName: string; commentId: string; createdAt: string; text: string }>;
    createdAt: string;
    kind: string;
    reactions: AgentReactionView[];
    text: string;
  }>;
  columns: Array<{
    columnId: string;
    preset: RetroColumnPreset | null;
    role: 'agreements' | null;
    title: string;
  }>;
  sprintId: number;
}

interface AppliedRow {
  detail?: string;
  error?: string;
  index: number;
  ok: boolean;
  op: string;
}

function toMcpView(board: RetroBoard): McpRetroBoardView {
  return {
    cards: board.cards
      .filter((card) => card.kind !== 'image')
      .map((card) => ({
        ...(card.authorName ? { authorName: card.authorName } : {}),
        cardId: card.id,
        columnId: card.columnId,
        comments: card.comments.map((comment) => ({
          authorName: comment.authorName,
          commentId: comment.id,
          createdAt: comment.createdAt,
          text: comment.text,
        })),
        createdAt: card.createdAt,
        kind: card.kind,
        reactions: groupReactionsForAgent(card.reactions.map((vote) => ({ emoji: vote.emoji, name: vote.userName }))),
        text: card.text,
      })),
    columns: board.columns.map((column) => ({
      columnId: column.id,
      preset: column.preset,
      role: column.role,
      title: column.title,
    })),
    sprintId: board.sprintId,
  };
}

function resolveColumnId(
  board: RetroBoard,
  input: { columnId?: string; columnPreset?: RetroColumnPreset }
): string | null {
  if (input.columnId) {
    return board.columns.some((column) => column.id === input.columnId) ? input.columnId : null;
  }
  if (!input.columnPreset) {
    return null;
  }
  return board.columns.find((column) => column.preset === input.columnPreset)?.id ?? null;
}

function requireChanged(
  before: ReturnType<typeof retroStoreFromBoards>,
  after: ReturnType<typeof retroStoreFromBoards>,
  sprintId: number,
  error: string
): RetroBoard {
  if (after === before) {
    throw new Error(error);
  }
  const board = after.boards[String(sprintId)];
  if (!board) {
    throw new Error(error);
  }
  return board;
}

function applyAddNote(board: RetroBoard, op: Extract<RetroBoardOp, { op: 'addNote' }>): {
  board: RetroBoard;
  detail: string;
} {
  const columnId = resolveColumnId(board, op);
  if (!columnId) {
    throw new Error('column_not_found');
  }
  const store = retroStoreFromBoards([board]);
  const next = addRetroNote(store, board.sprintId, columnId, op.text);
  const updated = requireChanged(store, next, board.sprintId, 'add_note_failed');
  const created = updated.cards[updated.cards.length - 1];
  return { board: updated, detail: `note ${created?.id ?? 'unknown'}` };
}

function applyMoveCard(board: RetroBoard, op: Extract<RetroBoardOp, { op: 'moveCard' }>): {
  board: RetroBoard;
  detail: string;
} {
  const columnId = resolveColumnId(board, op);
  if (!columnId) {
    throw new Error('column_not_found');
  }
  const store = retroStoreFromBoards([board]);
  const next = moveRetroCard(store, board.sprintId, op.cardId, columnId);
  return {
    board: requireChanged(store, next, board.sprintId, `move_failed: ${op.cardId}`),
    detail: `moved ${op.cardId} → ${columnId}`,
  };
}

function applyOneOp(input: {
  authorName: string;
  board: RetroBoard;
  op: RetroBoardOp;
}): { board: RetroBoard; detail: string } {
  const { board, op } = input;
  const store = retroStoreFromBoards([board]);
  const sprintId = board.sprintId;

  switch (op.op) {
    case 'addNote':
      return applyAddNote(board, op);
    case 'updateNote':
      return {
        board: requireChanged(
          store,
          updateRetroCardText(store, sprintId, op.cardId, op.text),
          sprintId,
          `card_not_found_or_unchanged: ${op.cardId}`
        ),
        detail: `note ${op.cardId}`,
      };
    case 'deleteCard':
      return {
        board: requireChanged(
          store,
          deleteRetroCard(store, op.cardId),
          sprintId,
          `card_not_found: ${op.cardId}`
        ),
        detail: `deleted ${op.cardId}`,
      };
    case 'moveCard':
      return applyMoveCard(board, op);
    case 'addComment':
      return {
        board: requireChanged(
          store,
          addRetroCardComment(store, sprintId, op.cardId, op.text, input.authorName),
          sprintId,
          `comment_failed: ${op.cardId}`
        ),
        detail: `comment on ${op.cardId}`,
      };
    case 'deleteComment':
      return {
        board: requireChanged(
          store,
          deleteRetroCardComment(store, sprintId, op.cardId, op.commentId),
          sprintId,
          `comment_not_found: ${op.commentId}`
        ),
        detail: `deleted comment ${op.commentId}`,
      };
    case 'addColumn': {
      const next = addRetroColumn(store, sprintId, op.title);
      const updated = requireChanged(store, next, sprintId, 'add_column_failed');
      const created = updated.columns[updated.columns.length - 1];
      return { board: updated, detail: `column ${created?.id ?? 'unknown'}` };
    }
    case 'renameColumn':
      return {
        board: requireChanged(
          store,
          renameRetroColumn(store, sprintId, op.columnId, op.title),
          sprintId,
          `rename_failed: ${op.columnId}`
        ),
        detail: `renamed ${op.columnId}`,
      };
    case 'deleteColumn':
      return {
        board: requireChanged(
          store,
          deleteRetroColumn(store, sprintId, op.columnId),
          sprintId,
          `delete_column_failed: ${op.columnId}`
        ),
        detail: `deleted column ${op.columnId}`,
      };
    case 'moveColumn':
      return {
        board: requireChanged(
          store,
          moveRetroColumn(store, sprintId, op.columnId, op.direction),
          sprintId,
          `move_column_failed: ${op.columnId}`
        ),
        detail: `moved column ${op.columnId}`,
      };
    case 'convertToAgreement':
      return {
        board: requireChanged(
          store,
          convertRetroNote(store, sprintId, op.cardId),
          sprintId,
          `convert_failed: ${op.cardId}`
        ),
        detail: `agreement ${op.cardId}`,
      };
    default: {
      const _exhaustive: never = op;
      throw new Error(`unsupported op ${String(_exhaustive)}`);
    }
  }
}

/** Apply ops in memory (no DB). Used by MCP write path and unit tests. */
export function applyRetroBoardOpsLocally(input: {
  authorName: string;
  board: RetroBoard;
  ops: RetroBoardOp[];
}): { applied: AppliedRow[]; board: RetroBoard } {
  let board = input.board;
  const applied: AppliedRow[] = [];
  for (let index = 0; index < input.ops.length; index++) {
    const op = input.ops[index]!;
    try {
      const result = applyOneOp({ authorName: input.authorName, board, op });
      board = result.board;
      applied.push({ detail: result.detail, index, ok: true, op: op.op });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      applied.push({ error: message, index, ok: false, op: op.op });
      return { applied, board };
    }
  }
  return { applied, board };
}

async function loadOrCreateBoard(input: {
  organizationId: string;
  sprintId: number;
}): Promise<RetroBoard> {
  const existing = await fetchRetroBoard(input);
  if (existing) {
    return existing;
  }
  const template = await readRetroColumnTemplate(input.organizationId);
  return resolveRetroBoard(retroStoreFromBoards([]), input.sprintId, template.columns);
}

/** Compact retro board for MCP agents (no image payloads). */
export async function getRetroBoardForOrganization(input: {
  organizationId: string;
  sprintId: number;
}): Promise<{ board: McpRetroBoardView; createdFromTemplate: boolean }> {
  const existing = await fetchRetroBoard(input);
  if (existing) {
    return { board: toMcpView(existing), createdFromTemplate: false };
  }
  const template = await readRetroColumnTemplate(input.organizationId);
  const board = resolveRetroBoard(retroStoreFromBoards([]), input.sprintId, template.columns);
  return { board: toMcpView(board), createdFromTemplate: true };
}

export async function applyRetroBoardOpsForOrganization(input: {
  authorName: string;
  confirm: boolean;
  ops: RetroBoardOp[];
  organizationId: string;
  sprintId: number;
}): Promise<{
  applied: AppliedRow[];
  board?: McpRetroBoardView;
  error?: string;
  ok: boolean;
}> {
  if (input.confirm !== true) {
    return {
      applied: [],
      error: 'confirm_required: set confirm=true to write retro board changes',
      ok: false,
    };
  }
  const base = await loadOrCreateBoard({
    organizationId: input.organizationId,
    sprintId: input.sprintId,
  });
  const { applied, board } = applyRetroBoardOpsLocally({
    authorName: input.authorName,
    board: base,
    ops: input.ops,
  });
  const failed = applied.find((row) => !row.ok);
  if (failed) {
    return {
      applied,
      error: `stopped at op[${failed.index}] ${failed.op}: ${failed.error ?? 'unknown'}`,
      ok: false,
    };
  }
  const saved = await upsertRetroBoard({
    base,
    board,
    organizationId: input.organizationId,
    sprintId: input.sprintId,
  });
  if (!saved) {
    return { applied, error: 'save_failed: could not persist retro board', ok: false };
  }
  notifySprintRealtime(
    new Request('http://localhost/api/mcp'),
    input.organizationId,
    input.sprintId,
    ['retro']
  );
  return { applied, board: toMcpView(saved), ok: true };
}

