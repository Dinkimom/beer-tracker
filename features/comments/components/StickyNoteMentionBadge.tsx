'use client';

interface StickyNoteMentionBadgeProps {
  isDragging: boolean;
  name: string;
}

export function StickyNoteMentionBadge({ isDragging, name }: StickyNoteMentionBadgeProps) {
  return (
    <span
      className={[
        // В тёмной теме бумага насыщенная — синий на ней не читается, берём чернила листа.
        'font-medium text-blue-700 dark:font-bold dark:text-inherit',
        isDragging ? 'pointer-events-none' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      @{name}
    </span>
  );
}
