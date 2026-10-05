'use client';

import { type MouseEvent } from 'react';

import { Button } from '@/components/Button';
import { iconSizeClassName } from '@/components/iconSizeClassName';
import { useI18n } from '@/contexts/LanguageContext';

const PIN_FILL_TRANSITION_MS = 200;

interface SwimlanePinButtonProps {
  /** Плашка держится, пока курсор над контролом, и не мигает при снятии пина. */
  holdHoverPlate?: boolean;
  isPinned: boolean;
  plateColor?: string;
  onToggle: () => void;
}

export function SwimlanePinButton({
  holdHoverPlate = false,
  isPinned,
  plateColor,
  onToggle,
}: SwimlanePinButtonProps) {
  const { t } = useI18n();
  const label = isPinned
    ? t('sprintPlanner.swimlane.unpinRow')
    : t('sprintPlanner.swimlane.pinRow');

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggle();
  };

  return (
    <Button
      aria-label={label}
      aria-pressed={isPinned}
      className={`!inline-flex !h-6 !w-6 !min-h-0 !min-w-0 !leading-none cursor-pointer items-center justify-center rounded-md !p-0 hover:!bg-gray-100 dark:hover:!bg-white/10 ${
        isPinned
          ? '!text-gray-800 dark:!text-gray-100'
          : 'text-gray-400 hover:!text-gray-700 dark:hover:!text-gray-200'
      }`}
      style={{
        transitionProperty: 'color',
        transitionDuration: '200ms',
        backgroundColor: holdHoverPlate ? plateColor : undefined,
      }}
      title={label}
      type="button"
      variant="ghost"
      onClick={handleClick}
    >
      <svg
        aria-hidden
        className={`${iconSizeClassName('sm')} block`}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        style={{
          fill: 'currentColor',
          fillOpacity: isPinned ? 1 : 0,
          transition: `fill-opacity ${PIN_FILL_TRANSITION_MS}ms ease-out`,
        }}
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
