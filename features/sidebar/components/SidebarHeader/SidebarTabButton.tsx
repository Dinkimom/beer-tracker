'use client';

import type { ReactNode } from 'react';

type TabVariant = 'amber' | 'blue' | 'emerald' | 'purple' | 'red' | 'violet';

/** Dark active badges: soft tint + light text (как активный tool в toolbar), без solid *-600. */
const VARIANT_CLASSES: Record<
  TabVariant,
  { active: string; badgeActive: string; badgeInactive: string }
> = {
  amber: {
    active: 'text-amber-600 dark:text-amber-400 border-amber-600 dark:border-amber-400 bg-amber-50/50 dark:bg-amber-900/30',
    badgeActive: 'bg-amber-600 text-white dark:bg-amber-500/25 dark:text-amber-200',
    badgeInactive: 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  },
  blue: {
    active: 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/30',
    badgeActive: 'bg-blue-600 text-white dark:bg-blue-500/25 dark:text-blue-200',
    badgeInactive: 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  },
  red: {
    active: 'text-red-600 dark:text-red-400 border-red-600 dark:border-red-400 bg-red-50/50 dark:bg-red-900/30',
    badgeActive: 'bg-red-600 text-white dark:bg-red-500/25 dark:text-red-200',
    badgeInactive: 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  },
  emerald: {
    active:
      'text-emerald-600 dark:text-emerald-400 border-emerald-600 dark:border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/30',
    badgeActive: 'bg-emerald-600 text-white dark:bg-emerald-500/25 dark:text-emerald-200',
    badgeInactive: 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  },
  purple: {
    active:
      'text-purple-600 dark:text-purple-400 border-purple-600 dark:border-purple-400 bg-purple-50/50 dark:bg-purple-900/30',
    badgeActive: 'bg-purple-600 text-white dark:bg-purple-500/25 dark:text-purple-200',
    badgeInactive: 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  },
  violet: {
    active:
      'text-violet-600 dark:text-violet-400 border-violet-600 dark:border-violet-400 bg-violet-50/50 dark:bg-violet-900/30',
    badgeActive: 'bg-violet-600 text-white dark:bg-violet-500/25 dark:text-violet-200',
    badgeInactive: 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  },
};

const BASE_CLASSES =
  'relative flex h-full min-h-[40px] items-center justify-center gap-2 px-4 py-0 text-sm font-semibold transition-colors duration-200 cursor-pointer border-b-2 flex-shrink-0';
const INACTIVE_CLASSES =
  'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700';

interface SidebarTabButtonProps {
  badge?: ReactNode;
  isActive: boolean;
  label: ReactNode;
  title?: string;
  variant: TabVariant;
  onClick: () => void;
}

export function SidebarTabButton({
  isActive,
  variant,
  label,
  badge,
  title,
  onClick,
}: SidebarTabButtonProps) {
  const v = VARIANT_CLASSES[variant];
  const buttonClasses = isActive ? v.active : INACTIVE_CLASSES;
  const badgeClasses = isActive ? v.badgeActive : v.badgeInactive;

  return (
    <button
      className={`${BASE_CLASSES} ${buttonClasses}`}
      title={title}
      type="button"
      onClick={onClick}
    >
      {label}
      {badge != null && (
        <span
          className={`px-2 py-1 rounded-full text-xs font-bold transition-colors duration-200 ${badgeClasses}`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
