'use client';

import type { InputHTMLAttributes, Ref } from 'react';

import { wrapWithTextTooltip } from './TextTooltip';

/** Цвета и фокус — как у селектов (`CustomSelect`, вариант outline): белое поле, в тёмной теме — `gray-700`. */
const BASE_CLASSES =
  'w-full border border-gray-300 bg-white text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20';

/**
 * `md` — поле формы: высота как у поля даты (`IsoDatePickerField`).
 * `sm` — поле в поповере, строке списка или плотной панели: высота как у компактного селекта.
 */
const SIZE_CLASSES = {
  md: 'h-10 rounded-lg px-3 text-sm',
  sm: 'h-8 rounded-md px-2.5 text-sm',
} as const;

const INVALID_CLASSES =
  'border-red-500 focus:border-red-600 focus:ring-red-500/20 dark:border-red-500 dark:focus:border-red-500';

type InputSize = keyof typeof SIZE_CLASSES;

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size'> {
  className?: string;
  /** Ошибка валидации: красная обводка и `aria-invalid`. */
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
  size?: InputSize;
}

export function Input({ className = '', invalid = false, size = 'md', title, ...props }: InputProps) {
  return wrapWithTextTooltip(
    <input
      aria-invalid={invalid || undefined}
      className={`${BASE_CLASSES} ${SIZE_CLASSES[size]} ${invalid ? INVALID_CLASSES : ''} ${className}`}
      {...props}
    />,
    title
  );
}
