'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { wrapWithTextTooltip } from './TextTooltip';

/** Квадратная кнопка-иконка: шапка, окна, панели, карточки. */
const chromeClass =
  'flex shrink-0 cursor-pointer items-center justify-center rounded-md text-ds-text-muted transition-all duration-200 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98] active:bg-gray-200 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-white/[0.06] dark:active:bg-white/10 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-800';

/** На сером холсте та же вуаль и тот же переход иконки, что у вкладок шапки. */
const canvasClass =
  'hover:!bg-black/[0.05] hover:!text-gray-900 active:!bg-black/10 dark:hover:!bg-white/10 dark:hover:!text-gray-100 dark:active:!bg-white/15 focus-visible:!ring-offset-ds-canvas';

/** Удаление и другие необратимые действия: красный hover поверх обычного или «на холсте». */
const dangerClass =
  'hover:!bg-red-50 hover:!text-red-600 active:!bg-red-100 dark:hover:!bg-red-900/20 dark:hover:!text-red-400 dark:active:!bg-red-900/40';

/** `md` — шапка, окна, панели; `sm` — внутри карточки или заголовка колонки. */
const sizeClass = {
  md: 'h-8 w-8',
  sm: 'h-7 w-7',
} as const;

interface HeaderIconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'type'> {
  children: ReactNode;
  className?: string;
  /** Полупрозрачная вуаль на hover: серый холст шапки, стекло колонки, карточка. */
  onCanvas?: boolean;
  size?: keyof typeof sizeClass;
  tone?: 'danger' | 'default';
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
}

export function HeaderIconButton({
  children,
  className = '',
  onCanvas = false,
  size = 'md',
  tone = 'default',
  type = 'button',
  title,
  disabled,
  'aria-label': ariaLabel,
  ...props
}: HeaderIconButtonProps) {
  const button = (
    <button
      aria-label={ariaLabel ?? title}
      className={`${chromeClass} ${sizeClass[size]} ${onCanvas ? canvasClass : ''} ${tone === 'danger' ? dangerClass : ''} ${className}`}
      disabled={disabled}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
  return wrapWithTextTooltip(button, title, { disabled: Boolean(disabled) });
}
