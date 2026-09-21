'use client';

import { Button } from '@/components/Button';
import { iconSizeClassName } from '@/components/iconSizeClassName';
import { useI18n } from '@/contexts/LanguageContext';

interface SwimlanePinButtonProps {
  isPinned: boolean;
  onToggle: () => void;
}

export function SwimlanePinButton({ isPinned, onToggle }: SwimlanePinButtonProps) {
  const { t } = useI18n();
  const label = isPinned
    ? t('sprintPlanner.swimlane.unpinRow')
    : t('sprintPlanner.swimlane.pinRow');

  return (
    <Button
      aria-label={label}
      aria-pressed={isPinned}
      className={`!inline-flex !h-6 !w-6 !min-h-0 !min-w-0 !leading-none cursor-pointer items-center justify-center rounded-md !p-0 ${
        isPinned
          ? '!bg-blue-50 text-blue-600 hover:!bg-blue-100 dark:!bg-blue-500/20 dark:text-blue-200 dark:hover:!bg-blue-500/30'
          : 'text-gray-400 hover:!bg-gray-100 hover:!text-gray-700 dark:hover:!bg-gray-800 dark:hover:!text-gray-200'
      }`}
      title={label}
      type="button"
      variant="ghost"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <svg
        aria-hidden
        className={`${iconSizeClassName('sm')} block`}
        fill={isPinned ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={isPinned ? '1.5' : '2'}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform="rotate(45 12 12)">
          <path d="M8 4h8" />
          <path d="M9 4v6l-2 4v2h10v-2l-2-4V4" />
          <path d="M12 16v5" />
        </g>
      </svg>
    </Button>
  );
}
