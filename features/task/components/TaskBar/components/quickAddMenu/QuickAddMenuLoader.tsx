'use client';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

import { QuickAddMenuCloseButton } from './QuickAddMenuCloseButton';

interface QuickAddMenuLoaderProps {
  disabled?: boolean;
  onClose: () => void;
}

export function QuickAddMenuLoader({ disabled = false, onClose }: QuickAddMenuLoaderProps) {
  const { t } = useI18n();

  return (
    <div className="relative">
      <div className="absolute right-2 top-2">
        <QuickAddMenuCloseButton disabled={disabled} onClose={onClose} />
      </div>
      <div
        aria-busy="true"
        aria-live="polite"
        className="flex min-h-[10.5rem] items-center justify-center gap-2 px-6 py-10 text-sm text-gray-500 dark:text-gray-400"
      >
        <Icon className="h-5 w-5 animate-spin text-gray-500 dark:text-gray-400" name="spinner" />
        {t('sprintPlanner.swimlane.quickAddMenu.loading')}
      </div>
    </div>
  );
}
