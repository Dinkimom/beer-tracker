'use client';

import { useEffect, useRef } from 'react';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

interface SearchInputProps {
  autoFocus?: boolean;
  className?: string;
  placeholder?: string;
  size?: 'md' | 'sm';
  value: string;
  onChange: (value: string) => void;
}

const sizeClasses = {
  sm: {
    input: 'pl-8 pr-7 py-1.5 text-xs rounded-md',
    icon: 'w-3.5 h-3.5',
    iconLeft: 'left-2.5',
    clearBtn: 'right-1 h-5 w-5',
  },
  md: {
    input: 'pl-9 pr-8 py-0 text-sm rounded-lg h-8',
    icon: 'w-4 h-4',
    iconLeft: 'left-2.5',
    clearBtn: 'right-1 h-6 w-6',
  },
};

const clearButtonClass =
  'absolute top-1/2 z-10 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded leading-none text-ds-text-muted transition-colors hover:bg-gray-200/90 dark:hover:bg-gray-600/80';

export function SearchInput({
  autoFocus = false,
  value,
  onChange,
  placeholder: placeholderProp,
  size = 'sm',
  className = '',
}: SearchInputProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const placeholder = placeholderProp ?? t('common.searchPlaceholder');
  const s = sizeClasses[size];

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  return (
    <div className={`relative w-full ${className}`}>
      <Icon
        className={`pointer-events-none absolute ${s.iconLeft} top-1/2 -translate-y-1/2 ${s.icon} text-gray-400 dark:text-gray-500`}
        name="search"
      />
      <input
        ref={inputRef}
        className={`w-full ${s.input} text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 placeholder:text-gray-500 dark:placeholder:text-gray-400`}
        placeholder={placeholder}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <button
          aria-label={t('common.clearSearch')}
          className={`${clearButtonClass} ${s.clearBtn}`}
          title={t('common.clearSearch')}
          type="button"
          onClick={() => onChange('')}
        >
          <Icon className={s.icon} name="x" />
        </button>
      ) : null}
    </div>
  );
}
