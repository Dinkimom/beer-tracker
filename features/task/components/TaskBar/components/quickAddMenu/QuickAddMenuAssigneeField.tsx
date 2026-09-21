'use client';

import { useI18n } from '@/contexts/LanguageContext';
import { UserSelector } from '@/features/sprint/components/SprintPlanner/components/UserSelector';

interface QuickAddMenuAssigneeFieldProps {
  assigneeId?: string;
  className?: string;
  isSubmitting: boolean;
  menuZIndex: number;
  onAssigneeChange?: (assigneeId: string) => void;
}

export function QuickAddMenuAssigneeField({
  assigneeId,
  className,
  isSubmitting,
  menuZIndex,
  onAssigneeChange,
}: QuickAddMenuAssigneeFieldProps) {
  const { t } = useI18n();
  return (
    <UserSelector
      className={className}
      compact
      disabled={isSubmitting}
      menuZIndex={menuZIndex}
      placeholder={t('sprintPlanner.swimlane.quickAddMenu.assigneePlaceholder')}
      title={t('sprintPlanner.swimlane.quickAddMenu.assigneeTitle')}
      value={assigneeId ?? ''}
      onChange={(value) => onAssigneeChange?.(value)}
    />
  );
}
