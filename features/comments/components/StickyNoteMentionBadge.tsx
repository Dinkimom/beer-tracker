'use client';

interface StickyNoteMentionBadgeProps {
  isDragging: boolean;
  name: string;
}

export function StickyNoteMentionBadge({ isDragging, name }: StickyNoteMentionBadgeProps) {
  return (
    <span
      className={[
        'font-medium text-blue-700 dark:text-blue-300',
        isDragging ? 'pointer-events-none' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      @{name}
    </span>
  );
}
