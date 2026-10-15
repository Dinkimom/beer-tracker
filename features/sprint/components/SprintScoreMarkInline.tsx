'use client';

import { BeerMugIcon } from '@/components/BeerMugIcon';
import { TextTooltip } from '@/components/TextTooltip';
import { SPRINT_SCORE_MAX_MARK } from '@/lib/sprints/sprintScoreHelpers';

export { SPRINT_SCORE_MAX_MARK };

const SIZE_CLASS = {
  bar: {
    gap: 'gap-1',
    icon: 'sm',
    shell: 'h-8 shrink-0 rounded-lg px-2.5',
  },
  lg: {
    gap: 'gap-1',
    icon: 'lg',
    shell: 'rounded-xl px-2.5 py-2',
  },
  md: {
    gap: 'gap-1',
    icon: 'md',
    shell: 'rounded-lg px-2.5 py-2',
  },
  sm: {
    gap: 'gap-0.5',
    icon: 'sm',
    shell: 'rounded-md px-1.5 py-1',
  },
} as const;

export function clampSprintScoreMark(mark: number): number {
  if (!Number.isFinite(mark)) {
    return 0;
  }
  return Math.max(0, Math.min(SPRINT_SCORE_MAX_MARK, Math.round(mark)));
}

const STATIC_SHELL =
  'inline-flex items-center bg-gray-100 dark:bg-gray-700/70';
const BUTTON_SHELL =
  `${STATIC_SHELL} cursor-pointer border-0 transition-all duration-200 hover:bg-gray-200 active:scale-[0.98] active:bg-gray-300 dark:hover:bg-gray-600 dark:active:bg-gray-500`;

export function SprintScoreMarkInline({
  ariaLabel,
  mark,
  size = 'sm',
  onClick,
}: {
  ariaLabel?: string;
  mark: number;
  size?: keyof typeof SIZE_CLASS;
  onClick?: () => void;
}) {
  const filled = clampSprintScoreMark(mark);
  const label = ariaLabel ?? `${filled}/${SPRINT_SCORE_MAX_MARK}`;
  const styles = SIZE_CLASS[size];
  const className = `${onClick ? BUTTON_SHELL : STATIC_SHELL} ${styles.gap} ${styles.shell}`;
  const icons = Array.from({ length: SPRINT_SCORE_MAX_MARK }, (_, index) => (
    <BeerMugIcon
      key={index}
      size={styles.icon}
      tone={index < filled ? 'color' : 'solid'}
    />
  ));

  return (
    <TextTooltip content={label}>
      {onClick ? (
        <button
          aria-label={label}
          className={className}
          type="button"
          onClick={onClick}
        >
          {icons}
        </button>
      ) : (
        <span aria-label={label} className={className} role="img">
          {icons}
        </span>
      )}
    </TextTooltip>
  );
}
