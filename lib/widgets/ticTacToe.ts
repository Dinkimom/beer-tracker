type TicTacToeMark = 'o' | 'x';

type TicTacToeCell = TicTacToeMark | null;

type TicTacToeWinner = TicTacToeMark | 'draw' | null;

export interface TicTacToeState {
  board: TicTacToeCell[];
  turn: TicTacToeMark;
  winner: TicTacToeWinner;
}

const TIC_TAC_TOE_INTEGRATION = 'tictactoe' as const;

const BOARD_SIZE = 9;

const WIN_LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function createTicTacToeState(): TicTacToeState {
  return {
    board: Array.from({ length: BOARD_SIZE }, () => null),
    turn: 'x',
    winner: null,
  };
}

export function ticTacToeWinningLine(state: TicTacToeState): readonly number[] | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    const mark = state.board[a];
    if (mark && mark === state.board[b] && mark === state.board[c]) {
      return line;
    }
  }
  return null;
}

function resolveWinner(board: readonly TicTacToeCell[]): TicTacToeWinner {
  const line = ticTacToeWinningLine({ board: [...board], turn: 'x', winner: null });
  if (line) {
    return board[line[0]] ?? null;
  }
  if (board.every((cell) => cell != null)) {
    return 'draw';
  }
  return null;
}

function turnAfterMove(turn: TicTacToeMark, winner: TicTacToeWinner): TicTacToeMark {
  if (winner) {
    return turn;
  }
  if (turn === 'x') {
    return 'o';
  }
  return 'x';
}

export function applyTicTacToeMove(state: TicTacToeState, index: number): TicTacToeState {
  if (state.winner || index < 0 || index >= BOARD_SIZE || state.board[index] != null) {
    return state;
  }
  const board = state.board.map((cell, cellIndex) => (cellIndex === index ? state.turn : cell));
  const winner = resolveWinner(board);
  return {
    board,
    turn: turnAfterMove(state.turn, winner),
    winner,
  };
}

export function serializeTicTacToeWidget(state: TicTacToeState): string {
  return JSON.stringify({
    v: 1,
    integration: TIC_TAC_TOE_INTEGRATION,
    board: state.board,
    turn: state.turn,
    winner: state.winner,
  });
}

function isMark(value: unknown): value is TicTacToeMark {
  return value === 'x' || value === 'o';
}

function isCell(value: unknown): value is TicTacToeCell {
  return value === null || isMark(value);
}

function isWinner(value: unknown): value is TicTacToeWinner {
  return value === null || value === 'draw' || isMark(value);
}

export function parseTicTacToeWidget(text: string): TicTacToeState | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const body = raw as Record<string, unknown>;
  if (body.v !== 1 || body.integration !== TIC_TAC_TOE_INTEGRATION) {
    return null;
  }
  if (!Array.isArray(body.board) || body.board.length !== BOARD_SIZE || !body.board.every(isCell)) {
    return null;
  }
  if (!isMark(body.turn) || !isWinner(body.winner)) {
    return null;
  }
  return {
    board: body.board,
    turn: body.turn,
    winner: body.winner,
  };
}
