interface TicTacToeGlyphProps {
  mark: 'o' | 'x';
}

/** Крупный знак в клетке партии. */
export function TicTacToeGlyph({ mark }: TicTacToeGlyphProps) {
  if (mark === 'o') {
    return (
      <svg aria-hidden className="h-[64%] w-[64%]" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="7.2" stroke="currentColor" strokeWidth="2.6" />
      </svg>
    );
  }
  return (
    <svg aria-hidden className="h-[64%] w-[64%]" fill="none" viewBox="0 0 24 24">
      <path
        d="M6.2 6.2l11.6 11.6M17.8 6.2L6.2 17.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.6"
      />
    </svg>
  );
}
