'use client';

import type { ReactNode } from 'react';

import { wrapWithTextTooltip } from '@/components/TextTooltip';

const BASE_CLASSES =
  'relative flex h-full shrink-0 cursor-pointer items-center justify-center gap-1.5 border-b-2 px-4 py-0 text-sm font-medium transition-all duration-200 active:scale-[0.98]';
const ACTIVE_CLASSES =
  'border-blue-600 text-blue-600 hover:bg-blue-600/10 active:bg-blue-600/15 dark:border-blue-300 dark:text-blue-300 dark:hover:bg-blue-500/20 dark:active:bg-blue-500/30';
const INACTIVE_CLASSES =
  'border-transparent text-gray-500 hover:bg-black/10 hover:text-gray-900 active:bg-black/[0.16] dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200 dark:active:bg-white/[0.16]';
const BADGE_CLASSES =
  'min-w-5 rounded-full bg-black/10 px-1.5 py-0.5 text-center text-[11px] font-medium leading-none text-gray-600 tabular-nums dark:bg-white/10 dark:text-gray-300';

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
  return wrapWithTextTooltip(
    <button
      className={`${BASE_CLASSES} ${isActive ? ACTIVE_CLASSES : INACTIVE_CLASSES}`}
      type="button"
      onClick={onClick}
    >
      {label}
      {badge != null && <span className={BADGE_CLASSES}>{badge}</span>}
    </button>,
    title
  );
}
