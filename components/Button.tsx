'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { wrapWithTextTooltip } from './TextTooltip';

type ButtonVariant =
  | 'accent'
  | 'danger'
  | 'dangerOutline'
  | 'ghost'
  | 'outline'
  | 'primary'
  | 'secondary'
  | 'warning';

const variantClasses: Record<ButtonVariant, string> = {
  /**
   * Soft fill + один тонкий бордер (без inset — иначе «двойная» кромка сверху).
   * Dark: тот же soft blue, что у активного инструмента в placement toolbar (`blue-500/20`).
   */
  primary:
    'rounded-lg border border-blue-700/20 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:pointer-events-none disabled:opacity-50 dark:border-blue-400/35 dark:bg-blue-500/20 dark:text-blue-200 dark:hover:border-blue-400/50 dark:hover:bg-blue-500/30 dark:active:bg-blue-500/40',
  /**
   * Filled muted control. Light: на hover −2 тона (как outline/select).
   * Dark: тот же lift, что у CustomSelect (`outline`): gray-700 → gray-600.
   */
  secondary:
    'rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-300 active:bg-gray-400 disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:active:bg-gray-500',
  /** Как кнопки «вторичного» действия в админке: белый фон и бордер. */
  outline:
    'rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-100 active:bg-gray-200 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 dark:active:bg-gray-500',
  accent:
    'rounded-lg border border-blue-500/60 bg-blue-50 text-blue-900 hover:bg-blue-100 active:bg-blue-200 disabled:pointer-events-none disabled:opacity-50 dark:border-blue-400/35 dark:bg-blue-500/15 dark:text-blue-200 dark:hover:bg-blue-500/25 dark:active:bg-blue-500/35',
  warning:
    'rounded-lg border border-amber-400/80 bg-amber-50 text-amber-950 hover:bg-amber-100 active:bg-amber-200 disabled:pointer-events-none disabled:opacity-50 dark:border-amber-500/45 dark:bg-amber-950/55 dark:text-amber-100 dark:hover:bg-amber-900/45 dark:active:bg-amber-900/70',
  danger:
    'rounded-lg bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:pointer-events-none disabled:opacity-50',
  /** Как `btnDanger` в админке: контурная деструктивная. */
  dangerOutline:
    'rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-50 active:bg-red-100 disabled:pointer-events-none disabled:opacity-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-950/40 dark:active:bg-red-950/70',
  ghost:
    'rounded-lg bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:pointer-events-none disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700',
};

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  className?: string;
  /** Полная ширина (flex-1 для кнопок в ряду) */
  fullWidth?: boolean;
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    fullWidth,
    className = '',
    children,
    type = 'button',
    title,
    disabled,
    ...props
  },
  ref
) {
  const base =
    'inline-flex cursor-pointer items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98]';
  const variantClass = variantClasses[variant];
  const widthClass = fullWidth ? 'flex-1' : '';
  const button = (
    <button
      ref={ref}
      className={`${base} ${variantClass} ${widthClass} ${className}`}
      disabled={disabled}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
  return wrapWithTextTooltip(button, title, { disabled: Boolean(disabled), fullWidth });
});
