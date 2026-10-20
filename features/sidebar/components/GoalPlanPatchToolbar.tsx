'use client';

import type { PlanPatchGoalAction } from '@/lib/sprints/sprintPlanPatchGoalPreview';
import type { PlanPatchGoalPreview } from '@/lib/sprints/sprintPlanPatchGoalPreview';

import { useI18n } from '@/contexts/LanguageContext';
import { DraftItemCommentButton } from '@/features/swimlane/components/DraftItemCommentButton';
import { TaskBarPendingApprovalToolbar } from '@/features/task/components/TaskBar/TaskBarPendingApprovalToolbar';

function goalCaption(action: PlanPatchGoalAction, t: (key: string) => string): {
  label: string;
  labelClassName?: string;
  labelIcon: string;
} {
  if (action === 'delete') {
    return {
      label: t('sprintPlanner.swimlane.planPatch.goalRemove'),
      labelClassName: 'text-red-600 dark:text-red-400',
      labelIcon: 'trash',
    };
  }
  if (action === 'create') {
    return {
      label: t('sprintPlanner.swimlane.planPatch.goalAdd'),
      labelClassName: 'text-green-700 dark:text-green-400',
      labelIcon: 'plus',
    };
  }
  return {
    label: t('sprintPlanner.swimlane.planPatch.goalUpdate'),
    labelIcon: 'edit',
  };
}

export function GoalPlanPatchToolbar({
  preview,
  sprintId,
  onApprove,
  onReject,
}: {
  preview: PlanPatchGoalPreview;
  sprintId: number | null;
  onApprove: (goalId: string) => void;
  onReject: (goalId: string) => void;
}) {
  const { t } = useI18n();
  const caption = goalCaption(preview.action, t);
  return (
    <TaskBarPendingApprovalToolbar
      clientBrand={preview.clientBrand}
      commentId={preview.goalId}
      extraAction={
        <DraftItemCommentButton
          sprintId={sprintId}
          targetId={preview.goalId}
          targetKind="goal"
          targetLabel={preview.text}
        />
      }
      label={caption.label}
      labelClassName={caption.labelClassName}
      labelIcon={caption.labelIcon}
      placement="inline"
      onApprove={onApprove}
      onReject={onReject}
    />
  );
}
