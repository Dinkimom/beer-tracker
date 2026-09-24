'use client';

import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';

import {
  placePlannerOnboardingCallout,
  type PlannerOnboardingCalloutSide,
  type RectBox,
} from './plannerOnboardingGeometry';
import { PlannerOnboardingPopover } from './PlannerOnboardingPopover';

const TIP_SIZE = { height: 140, width: 320 };

export function PlannerOnboardingTipLayer({
  body,
  onDismiss,
  rect,
  side,
}: {
  body: string;
  onDismiss: () => void;
  rect: RectBox | null;
  side: PlannerOnboardingCalloutSide;
}) {
  const { t } = useI18n();
  const origin = placePlannerOnboardingCallout(
    rect,
    side,
    {
      height: typeof window === 'undefined' ? 0 : window.innerHeight,
      width: typeof window === 'undefined' ? 0 : window.innerWidth,
    },
    TIP_SIZE
  );
  return (
    <div className="fixed" style={{ ...origin, zIndex: ZIndex.tooltip }}>
      <PlannerOnboardingPopover
        body={body}
        focusToken={body}
        primaryLabel={t('sprintPlanner.onboarding.tipDismiss')}
        onPrimary={onDismiss}
      />
    </div>
  );
}
