'use client';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

interface QuarterlyPlannerShowDevelopmentPlanButtonProps {
  onShow: () => void;
}

export function QuarterlyPlannerShowDevelopmentPlanButton({
  onShow,
}: QuarterlyPlannerShowDevelopmentPlanButtonProps) {
  const { t } = useI18n();

  return (
    <HeaderIconButton
      aria-label={t('planning.quarterlyV2.showDevelopmentPlanAria')}
      className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover/quarterly-task-title-cell:opacity-100 focus:opacity-100"
      title={t('planning.quarterlyV2.showDevelopmentPlanTitle')}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onShow();
      }}
    >
      <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" name="phase-segments" />
    </HeaderIconButton>
  );
}
