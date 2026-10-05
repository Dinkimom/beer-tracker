'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { wrapWithTextTooltip } from './TextTooltip';

/** Квадратная кнопка-иконка в хроме шапки (основное приложение и админка). */
const chromeClass =
  'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-ds-text-muted transition-all duration-200 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98] active:bg-gray-200 dark:hover:bg-white/[0.06] dark:active:bg-white/10 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-800';

/** На сером холсте то же затемнение, что у вкладок и ссылки админки. */
const canvasClass =
  'hover:!bg-black/[0.05] active:!bg-black/10 dark:hover:!bg-white/10 dark:active:!bg-white/15 focus-visible:!ring-offset-ds-canvas';

interface HeaderIconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'type'> {
  children: ReactNode;
  className?: string;
  /** Шапка основного приложения лежит на сером холсте, не на белой поверхности. */
  onCanvas?: boolean;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
}

export function HeaderIconButton({
  children,
  className = '',
  onCanvas = false,
  type = 'button',
  title,
  disabled,
  'aria-label': ariaLabel,
  ...props
}: HeaderIconButtonProps) {
  const button = (
    <button
      aria-label={ariaLabel ?? title}
      className={`${chromeClass} ${onCanvas ? canvasClass : ''} ${className}`}
      disabled={disabled}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
  return wrapWithTextTooltip(button, title, { disabled: Boolean(disabled) });
}
