'use client';

import type { ButtonHTMLAttributes } from 'react';

import { Icon } from '@/components/Icon';

interface SprintPlannerTimerIconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  icon: string;
  prominent?: boolean;
}

const BASE_CLASS =
  'inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-700 transition-colors disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-200';

export function SprintPlannerTimerIconButton({
  disabled,
  icon,
  prominent = false,
  type = 'button',
  ...props
}: SprintPlannerTimerIconButtonProps) {
  const tone = prominent
    ? 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'
    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/80 dark:hover:bg-gray-600';
  return (
    <button className={`${BASE_CLASS} ${tone}`} disabled={disabled} type={type} {...props}>
      <Icon className="h-5 w-5" name={icon} />
    </button>
  );
}
