interface JiraToolIconProps {
  className?: string;
}

/** Знак Jira Software: ромб с отверстием и двумя складками, цвет — currentColor. */
export function JiraToolIcon({ className }: JiraToolIconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 .6 23.4 12 12 23.4 .6 12Z M12 8.5 15.5 12 12 15.5 8.5 12Z"
        fillRule="evenodd"
      />
      <path d="M12 .6 8.5 12 12 8.5Z" opacity="0.45" />
      <path d="M12 23.4 15.5 12 12 15.5Z" opacity="0.45" />
    </svg>
  );
}
