'use client';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

interface PageHeaderChristmasThemeButtonProps {
  christmasThemeEnabled: boolean;
  onToggle: () => void;
}

export function PageHeaderChristmasThemeButton({
  christmasThemeEnabled,
  onToggle,
}: PageHeaderChristmasThemeButtonProps) {
  const { t } = useI18n();
  const title = christmasThemeEnabled
    ? t('header.actions.disableChristmasTheme')
    : t('header.actions.enableChristmasTheme');
  const iconClass = christmasThemeEnabled
    ? 'h-4 w-4 text-blue-500 dark:text-blue-400'
    : 'h-4 w-4 text-ds-text-muted';

  return (
    <HeaderIconButton title={title} type="button" onClick={onToggle}>
      <Icon className={iconClass} name="snowflake" />
    </HeaderIconButton>
  );
}
