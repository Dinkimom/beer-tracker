'use client';

import type { ComponentProps } from 'react';

import { useState } from 'react';

import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type'>;

export function PasswordInput({ className = '', ...props }: PasswordInputProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const mergedClass = [className, 'pr-10'].filter(Boolean).join(' ');
  return (
    <div className="relative">
      <Input {...props} className={mergedClass} type={visible ? 'text' : 'password'} />
      <TextTooltip content={visible ? t('common.hidePassword') : t('common.showPassword')}>
      <button
        aria-label={visible ? t('common.hidePassword') : t('common.showPassword')}
        aria-pressed={visible}
        className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-ds-text-muted transition-all duration-200 hover:bg-gray-200/90 dark:hover:bg-gray-600/80 cursor-pointer active:scale-[0.98]"
        type="button"
        onClick={() => setVisible((v) => !v)}
      >
        <Icon className="h-4 w-4 shrink-0" name={visible ? 'eye-off' : 'eye'} />
      </button>
      </TextTooltip>
    </div>
  );
}
