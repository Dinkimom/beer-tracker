'use client';

import type { ForwardedRef } from 'react';

import { forwardRef, type TextareaHTMLAttributes } from 'react';

const BASE_CLASSES =
  'w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none transition-colors';

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
