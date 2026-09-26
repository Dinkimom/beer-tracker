'use client';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { ThemeToggleIcon } from '@/components/ThemeToggleIcon';
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
      <ThemeToggleIcon theme={theme} />
    </HeaderIconButton>
  );
}
