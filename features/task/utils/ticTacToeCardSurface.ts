import type { CSSProperties } from 'react';

interface TicTacToeCardPaint {
  board: string;
  border: string;
  cell: string;
  cellWin: string;
  o: string;
  x: string;
}

const TIC_TAC_TOE_PAINT_LIGHT: TicTacToeCardPaint = {
  board: '#d5dbe3',
  border: '#c3cad3',
  cell: '#f7f8fa',
  cellWin: '#e4edf8',
  o: '#be123c',
  x: '#1d4ed8',
};

const TIC_TAC_TOE_PAINT_DARK: TicTacToeCardPaint = {
  board: '#12161e',
  border: '#465062',
  cell: '#2c3544',
  cellWin: '#3c4e68',
  o: '#ff9aaf',
  x: '#8eb6ff',
};

export function getTicTacToeCardPaint(isDark = false): TicTacToeCardPaint {
  return isDark ? TIC_TAC_TOE_PAINT_DARK : TIC_TAC_TOE_PAINT_LIGHT;
}

/** Плоская доска: фон карточки — это линии сетки, без тени фото. */
export function getTicTacToeCardStyle(isDark = false): CSSProperties {
  const paint = getTicTacToeCardPaint(isDark);
  return {
    backgroundColor: paint.board,
    borderColor: paint.border,
    borderRadius: 0,
    borderStyle: 'solid',
    borderWidth: 1,
    boxShadow: 'none',
    color: isDark ? '#e7ebf0' : '#1c2430',
  };
}
