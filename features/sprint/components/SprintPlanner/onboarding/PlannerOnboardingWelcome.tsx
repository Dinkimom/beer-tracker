'use client';

import { useEffect } from 'react';

import { OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { useDeferredOverlayClose } from '@/hooks/useOverlayPresence';

import { PlannerOnboardingPopover } from './PlannerOnboardingPopover';

export function PlannerOnboardingWelcome({
  onSkip,
  onStart,
}: {
  onSkip: () => void;
  onStart: () => void;
}) {
  const { t } = useI18n();
  const overlay = useDeferredOverlayClose(onSkip);
  const requestClose = overlay.requestClose;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      requestClose();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [requestClose]);

  return (
    <div
      aria-labelledby="planner-onboarding-title"
      className={`fixed bottom-5 right-5 ${OVERLAY_PANEL_ENTER}`}
      data-planner-onboarding-dialog="true"
      data-state={overlay.state}
      role="dialog"
      style={{ zIndex: ZIndex.overlay }}
      onAnimationEnd={overlay.onAnimationEnd}
    >
      <PlannerOnboardingPopover
        body={t('sprintPlanner.onboarding.welcomeBody')}
        focusToken="welcome"
        mark="👋"
        primaryLabel={t('sprintPlanner.onboarding.welcomeStart')}
        secondaryLabel={t('sprintPlanner.onboarding.skip')}
        title={t('sprintPlanner.onboarding.welcomeTitle')}
        onPrimary={onStart}
        onSecondary={requestClose}
      />
    </div>
  );
}
