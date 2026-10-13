interface TicTacToeMarkProps {
  className?: string;
}

/** Жирная сетка: крестики по главной диагонали, нолики по второй. */
export function TicTacToeMark({ className }: TicTacToeMarkProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="currentColor" height="21.2" rx="0.6" width="2.7" x="10.65" y="1.4" />
      <rect fill="currentColor" height="2.7" rx="0.6" width="21.2" x="1.4" y="10.65" />
      <path
        d="M3.35 3.35l5.2 5.2M8.55 3.35l-5.2 5.2M15.45 15.45l5.2 5.2M20.65 15.45l-5.2 5.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.85"
      />
      <circle cx="18.05" cy="5.95" r="2.15" stroke="currentColor" strokeWidth="1.85" />
      <circle cx="5.95" cy="18.05" r="2.15" stroke="currentColor" strokeWidth="1.85" />
    </svg>
  );
}
