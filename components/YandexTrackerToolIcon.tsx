interface YandexTrackerToolIconProps {
  className?: string;
}

/** Знак Яндекс Трекера: пять квадратов буквой «Т», без чёрной плашки. */
export function YandexTrackerToolIcon({ className }: YandexTrackerToolIconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="currentColor"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect height="4" opacity="0.72" width="4" x="1" y="1" />
      <rect height="4" width="4" x="6" y="1" />
      <rect height="4" opacity="0.72" width="4" x="11" y="1" />
      <rect height="4" opacity="0.55" width="4" x="6" y="6" />
      <rect height="4" opacity="0.4" width="4" x="6" y="11" />
    </svg>
  );
}
