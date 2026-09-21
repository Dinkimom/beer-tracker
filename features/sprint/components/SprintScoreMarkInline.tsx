'use client';

import { BeerMugIcon } from '@/components/BeerMugIcon';
import { SPRINT_SCORE_MAX_MARK } from '@/lib/sprints/sprintScoreHelpers';

export { SPRINT_SCORE_MAX_MARK };

const SIZE_CLASS = {
  lg: {
    gap: 'gap-1',
    shell: 'rounded-xl px-2.5 py-2',
  },
  md: {
    gap: 'gap-1',
    shell: 'rounded-lg px-2.5 py-2',
  },
  sm: {
    gap: 'gap-0.5',
    shell: 'rounded-md px-1.5 py-1',
  },
} as const;

export function clampSprintScoreMark(mark: number): number {
  if (!Number.isFinite(mark)) {
    return 0;
  }
  return Math.max(0, Math.min(SPRINT_SCORE_MAX_MARK, Math.round(mark)));
}

export function SprintScoreMarkInline({
  ariaLabel,
  mark,
  size = 'sm',
}: {
  ariaLabel?: string;
  mark: number;
  size?: 'lg' | 'md' | 'sm';
}) {
  const filled = clampSprintScoreMark(mark);
  const label = ariaLabel ?? `${filled}/${SPRINT_SCORE_MAX_MARK}`;
  const styles = SIZE_CLASS[size];

  return (
    <span
      aria-label={label}
      className={`inline-flex items-center ${styles.gap} ${styles.shell} bg-gray-100 dark:bg-gray-700/70`}
      role="img"
      title={label}
    >
      {Array.from({ length: SPRINT_SCORE_MAX_MARK }, (_, index) => (
        <BeerMugIcon
          key={index}
          size={size}
          tone={index < filled ? 'color' : 'solid'}
        />
      ))}
    </span>
  );
}
