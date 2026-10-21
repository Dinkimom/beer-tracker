import type { CSSProperties } from 'react';

interface TicTacToeCardPaint {
  border: string;
  grid: string;
  o: string;
  surface: string;
  text: string;
  x: string;
}

const TIC_TAC_TOE_PAINT_LIGHT: TicTacToeCardPaint = {
  border: '#dfe3e8',
  grid: '#c9d0d9',
  o: '#e11d48',
  surface: '#fbfcfd',
  text: '#334155',
  x: '#2563eb',
};

const TIC_TAC_TOE_PAINT_DARK: TicTacToeCardPaint = {
  border: '#3b4453',
  grid: '#4b5566',
  o: '#fb7185',
  surface: '#242b37',
  text: '#d6dde6',
  x: '#7aa7ff',
};

export function getTicTacToeCardPaint(isDark = false): TicTacToeCardPaint {
  return isDark ? TIC_TAC_TOE_PAINT_DARK : TIC_TAC_TOE_PAINT_LIGHT;
}

/** Плоский лист бумаги с сеткой «#»: без тени, чтобы не ложиться на задачу выше. */
export function getTicTacToeCardStyle(isDark = false): CSSProperties {
  const paint = getTicTacToeCardPaint(isDark);
  return {
    backgroundColor: paint.surface,
    borderColor: paint.border,
    borderRadius: 0,
    borderStyle: 'solid',
    borderWidth: 1,
    boxShadow: 'none',
    color: paint.text,
  };
}
