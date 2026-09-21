interface CardLinkIconProps {
  className?: string;
}

/** Стрелка связи карточек на планере, не URL (цепочка — `Icon name="link"`). */
export function CardLinkIcon({ className = 'h-4 w-4 shrink-0' }: CardLinkIconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 12h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="m12 5 7 7-7 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
