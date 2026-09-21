/** Иконка «колба с плюсом» — как смайл с плюсом у кнопки реакций. */

interface TaskBarQACreateIconProps {
  className?: string;
}

export function TaskBarQACreateIcon({ className = 'h-4 w-4' }: TaskBarQACreateIconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(0.6 2.2) scale(0.72)">
        <path
          d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.452l-5.069-10.127A2 2 0 0 1 14 9.527V2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.8"
        />
        <path d="M8.5 2h7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.8" />
      </g>
      <path d="M15 5.25h8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
      <path d="M19 1.5v7.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
    </svg>
  );
}
