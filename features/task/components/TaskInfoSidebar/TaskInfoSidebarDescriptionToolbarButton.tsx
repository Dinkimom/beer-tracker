'use client';

import { Icon } from '@/components/Icon';
import { wrapWithTextTooltip } from '@/components/TextTooltip';

const TOOLBAR_BTN_CLASS =
  'inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-gray-800 active:scale-[0.98] active:bg-gray-200 disabled:pointer-events-none disabled:opacity-35 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100 dark:active:bg-gray-600';

const TOOLBAR_BTN_ACTIVE_CLASS =
  'bg-gray-100 text-gray-900 hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-700 dark:text-gray-50 dark:hover:bg-gray-700 dark:hover:text-gray-50';

const TOOLBAR_ICON_CLASS = 'h-4 w-4 shrink-0 text-current';

interface TaskInfoSidebarDescriptionToolbarButtonProps {
  active?: boolean;
  disabled?: boolean;
  icon?: string;
  label: string;
  text?: string;
  onClick: () => void;
}

export function TaskInfoSidebarDescriptionToolbarButton({
  active = false,
  disabled = false,
  icon,
  label,
  text,
  onClick,
}: TaskInfoSidebarDescriptionToolbarButtonProps) {
  return wrapWithTextTooltip(
    <button
      aria-label={label}
      aria-pressed={active}
      className={`${TOOLBAR_BTN_CLASS} ${text ? 'min-w-8 px-1.5 text-xs font-semibold' : 'w-8'} ${
        active ? TOOLBAR_BTN_ACTIVE_CLASS : ''
      }`}
      disabled={disabled}
      type="button"
      onClick={onClick}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
    >
      {icon ? <Icon className={TOOLBAR_ICON_CLASS} name={icon} /> : text}
    </button>,
    text ? undefined : label,
    { disabled }
  );
}

export { TOOLBAR_BTN_ACTIVE_CLASS, TOOLBAR_BTN_CLASS, TOOLBAR_ICON_CLASS };
