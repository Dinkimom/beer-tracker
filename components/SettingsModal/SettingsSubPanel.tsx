'use client';

import type { ReactNode } from 'react';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

interface SettingsSubPanelProps {
  children: ReactNode;
  title: string;
  onBack: () => void;
  onClose: () => void;
}

/** Экран внутри окна настроек, открытый поверх вкладок: «назад» возвращает к ним, содержимое прокручивается. */
export function SettingsSubPanel({ children, title, onBack, onClose }: SettingsSubPanelProps) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-shrink-0 items-center gap-2 px-3 pb-1 pt-3">
        <HeaderIconButton aria-label={t('settings.changelog.back')} type="button" onClick={onBack}>
          <Icon className="h-5 w-5" name="arrow-left" />
        </HeaderIconButton>
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        <HeaderIconButton aria-label={t('settings.accessibility.closeSettings')} type="button" onClick={onClose}>
          <Icon className="h-5 w-5" name="close" />
        </HeaderIconButton>
      </div>
      <div className="scrollbar-thin-custom min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
    </div>
  );
}
