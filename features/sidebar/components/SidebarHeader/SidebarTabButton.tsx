'use client';

import type { ReactNode } from 'react';

const BASE_CLASSES =
  'relative flex h-full shrink-0 cursor-pointer items-center justify-center gap-1.5 border-b-2 px-4 py-0 text-sm font-medium transition-colors duration-200';
const ACTIVE_CLASSES = 'border-blue-600 text-blue-600 dark:border-blue-300 dark:text-blue-300';
const INACTIVE_CLASSES =
  'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200';
const BADGE_CLASSES =
  'min-w-5 rounded-full bg-gray-100 px-1.5 py-0.5 text-center text-[11px] font-medium leading-none text-gray-600 tabular-nums dark:bg-gray-700 dark:text-gray-300';

interface SidebarTabButtonProps {
  badge?: ReactNode;
  isActive: boolean;
  label: ReactNode;
  title?: string;
  onClick: () => void;
}

export function SidebarTabButton({
  isActive,
  label,
  badge,
  title,
  onClick,
}: SidebarTabButtonProps) {
  return (
    <button
      className={`${BASE_CLASSES} ${isActive ? ACTIVE_CLASSES : INACTIVE_CLASSES}`}
      title={title}
      type="button"
      onClick={onClick}
    >
      {label}
      {badge != null && <span className={BADGE_CLASSES}>{badge}</span>}
    </button>
  );
}
