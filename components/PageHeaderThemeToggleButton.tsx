'use client';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

interface PageHeaderThemeToggleButtonProps {
  theme: 'dark' | 'light';
  onToggle: () => void;
}

export function PageHeaderThemeToggleButton({ theme, onToggle }: PageHeaderThemeToggleButtonProps) {
  const { t } = useI18n();
  const title =
    theme === 'light'
      ? t('header.actions.switchToDarkTheme')
      : t('header.actions.switchToLightTheme');

  return (
    <HeaderIconButton title={title} type="button" onClick={onToggle}>
      {theme === 'light' ? (
        <Icon className="h-4 w-4 text-amber-500" name="sun" />
      ) : (
        <Icon className="h-4 w-4 text-amber-400" name="moon" />
      )}
    </HeaderIconButton>
  );
}
