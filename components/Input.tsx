'use client';

import type { InputHTMLAttributes } from 'react';

const BASE_CLASSES =
  'w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-blue-400/40 dark:focus-visible:ring-offset-gray-800 transition-colors';

const INVALID_CLASSES =
  'border-red-500 focus:border-red-600 dark:border-red-500 dark:focus:border-red-500';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  className?: string;
  /** Ошибка валидации: красная обводка и `aria-invalid`. */
  invalid?: boolean;
}

export function Input({ className = '', invalid = false, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={`${BASE_CLASSES} ${invalid ? INVALID_CLASSES : ''} ${className}`}
      {...props}
    />
  );
}
