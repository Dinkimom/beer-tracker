'use client';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';

interface QuarterlyPlannerEditModeToolbarProps {
  isEditingPlan: boolean;
  onEditingPlanChange: (value: boolean) => void;
}

const inactiveBtnClass = 'text-gray-600 dark:text-gray-400';

export function QuarterlyPlannerEditModeToolbar({
  isEditingPlan,
  onEditingPlanChange,
}: QuarterlyPlannerEditModeToolbarProps) {
  const { t } = useI18n();

  return (
    <Button
      aria-pressed={isEditingPlan}
      className={`!h-8 shrink-0 !px-3 text-xs font-medium ${isEditingPlan ? '' : inactiveBtnClass}`}
      type="button"
      variant={isEditingPlan ? 'accent' : 'outline'}
      onClick={() => onEditingPlanChange(!isEditingPlan)}
    >
      {t('planning.quarterlyV2.editPlan')}
    </Button>
  );
}
