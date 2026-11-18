'use client';

import type { ForwardedRef } from 'react';

import { forwardRef, type TextareaHTMLAttributes } from 'react';

/** Тот же вид, что у `Input` размера `md`: белое поле, в тёмной теме — `gray-700`. */
const BASE_CLASSES =
  'w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20';

interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  className?: string;
}

export const TextArea = forwardRef(function TextArea(
  { className = '', ...props }: TextAreaProps,
  ref: ForwardedRef<HTMLTextAreaElement>
) {
  return (
    <textarea
      ref={ref}
      className={`${BASE_CLASSES} ${className}`}
      {...props}
    />
  );
});
