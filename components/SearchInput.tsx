'use client';

import { useEffect, useRef } from 'react';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { glassLensControlClass } from '@/features/context-menu/contextMenuClasses';

interface SearchInputProps {
  'aria-label'?: string;
  autoFocus?: boolean;
  className?: string;
  placeholder?: string;
  size?: 'md' | 'sm';
  /** На стеклянной плашке: полупрозрачная линза вместо белой карточки. */
  surface?: 'glass' | 'solid';
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
  'absolute top-1/2 z-10 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded leading-none text-ds-text-muted transition-all duration-200 hover:bg-gray-200/90 active:scale-[0.98] active:bg-gray-300 dark:hover:bg-gray-600/80 dark:active:bg-gray-500';

const SOLID_FIELD_CHROME =
  'border border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700';

export function SearchInput({
  'aria-label': ariaLabel,
  autoFocus = false,
  value,
  onChange,
  placeholder: placeholderProp,
  size = 'sm',
  surface = 'solid',
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
        aria-label={ariaLabel}
        className={`w-full ${s.input} text-gray-900 focus:outline-none transition-colors duration-200 placeholder:text-gray-500 dark:text-gray-100 dark:placeholder:text-gray-400 ${surface === 'glass' ? glassLensControlClass() : SOLID_FIELD_CHROME}`}
        placeholder={placeholder}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <button
          aria-label={t('common.clearSearch')}
          className={`${clearButtonClass} ${s.clearBtn}`}
          type="button"
          onClick={() => onChange('')}
        >
          <Icon className={s.icon} name="x" />
        </button>
      ) : null}
    </div>
  );
}
