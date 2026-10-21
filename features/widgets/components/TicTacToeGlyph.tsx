interface TicTacToeGlyphProps {
  mark: 'o' | 'x';
}

/** Крупный знак в клетке партии: X и O одного оптического веса. */
export function TicTacToeGlyph({ mark }: TicTacToeGlyphProps) {
  if (mark === 'o') {
    return (
      <svg aria-hidden className="h-[58%] w-[58%]" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="3" />
      </svg>
    );
  }
  return (
    <svg aria-hidden className="h-[58%] w-[58%]" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 5l14 14M19 5L5 19"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}
