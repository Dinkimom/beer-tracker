'use client';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

interface QuarterlyPlannerRemoveFromPlanButtonProps {
  hoverGroup?: 'parent-row' | 'task-title-cell';
  onRemove: () => void;
}

export function QuarterlyPlannerRemoveFromPlanButton({
  onRemove,
  hoverGroup = 'task-title-cell',
}: QuarterlyPlannerRemoveFromPlanButtonProps) {
  const { t } = useI18n();
  const hoverVisibleClass =
    hoverGroup === 'parent-row'
      ? 'group-hover/quarterly-parent-row:opacity-100'
      : 'group-hover/quarterly-task-title-cell:opacity-100';

  return (
    <HeaderIconButton
      aria-label={t('planning.quarterlyV2.removeFromPlanAria')}
      className={`h-7 w-7 shrink-0 opacity-0 transition-opacity ${hoverVisibleClass} focus:opacity-100`}
      title={t('planning.quarterlyV2.removeFromPlanTitle')}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
    >
      <Icon className="h-4 w-4 text-red-600 dark:text-red-400" name="x" />
    </HeaderIconButton>
  );
}
