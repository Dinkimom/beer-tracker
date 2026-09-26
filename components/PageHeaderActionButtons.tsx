'use client';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { PageHeaderChristmasThemeButton } from '@/components/PageHeaderChristmasThemeButton';
import { PageHeaderThemeToggleButton } from '@/components/PageHeaderThemeToggleButton';
import { useI18n } from '@/contexts/LanguageContext';
import { usePlannerOnboardingReplayAction } from '@/contexts/PlannerOnboardingReplayBridge';

interface PageHeaderActionButtonsProps {
  christmasThemeEnabled: boolean;
  isChristmasPeriod: boolean;
  theme: 'dark' | 'light';
  onChristmasThemeToggle: () => void;
  onSettingsOpen: () => void;
  onThemeToggle: () => void;
}

export function PageHeaderActionButtons({
  theme,
  christmasThemeEnabled,
  isChristmasPeriod,
  onThemeToggle,
  onChristmasThemeToggle,
  onSettingsOpen,
}: PageHeaderActionButtonsProps) {
  const { t } = useI18n();
  const replayOnboarding = usePlannerOnboardingReplayAction();

  return (
    <div className="flex items-center gap-2">
      <HeaderIconButton title={t('header.actions.settings')} type="button" onClick={onSettingsOpen}>
        <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" name="settings" />
      </HeaderIconButton>
      {isChristmasPeriod ? (
        <PageHeaderChristmasThemeButton
          christmasThemeEnabled={christmasThemeEnabled}
          onToggle={onChristmasThemeToggle}
        />
      ) : null}
      <PageHeaderThemeToggleButton theme={theme} onToggle={onThemeToggle} />
      {replayOnboarding ? (
        <HeaderIconButton
          aria-label={t('sprintPlanner.onboarding.replay')}
          title={t('sprintPlanner.onboarding.replay')}
          type="button"
          onClick={replayOnboarding}
        >
          <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" name="circle-help" />
        </HeaderIconButton>
      ) : null}
    </div>
  );
}
