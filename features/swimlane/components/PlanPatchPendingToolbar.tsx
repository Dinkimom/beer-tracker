'use client';

import type { PlanPatchPositionPreview } from '@/lib/sprints/sprintPlanPatchPositionPreview';

import { useI18n } from '@/contexts/LanguageContext';
import { TaskBarPendingApprovalToolbar } from '@/features/task/components/TaskBar/TaskBarPendingApprovalToolbar';
import { planPatchPreviewCaptionText } from '@/lib/sprints/sprintPlanPatchPositionPreview';

import { usePlanPatchPreviewDecisions } from '../hooks/usePlanPatchPreviewDecisions';

import { DraftItemCommentButton } from './DraftItemCommentButton';

export function planPatchCaptionTone(
  preview: Pick<PlanPatchPositionPreview, 'changes' | 'remove'>
): { className: string; icon: string | null } {
  if (preview.remove) {
    return { className: 'text-red-600 dark:text-red-400', icon: 'trash' };
  }
  if (preview.changes.includes('schedule')) {
    return { className: '', icon: 'arrow-right' };
  }
  if (preview.changes.includes('segments')) {
    return { className: '', icon: 'phase-segments' };
  }
  // New placement (incl. already split into segments) — from backlog onto the plan.
  if (preview.changes.length === 0) {
    return { className: 'text-green-700 dark:text-green-400', icon: 'plan-add' };
  }
  return { className: '', icon: null };
}

export function PlanPatchPendingToolbar({
  preview,
  sprintId,
}: {
  preview: PlanPatchPositionPreview | null;
  sprintId: number | null | undefined;
}) {
  const { t } = useI18n();
  const { approve, reject } = usePlanPatchPreviewDecisions(sprintId);
  if (!preview || sprintId == null) {
    return null;
  }
  const label = planPatchPreviewCaptionText(preview, {
    add: t('sprintPlanner.swimlane.planPatch.add'),
    and: t('sprintPlanner.swimlane.planPatch.and'),
    duration: t('sprintPlanner.swimlane.planPatch.duration'),
    remove: t('sprintPlanner.swimlane.planPatch.remove'),
    schedule: t('sprintPlanner.swimlane.planPatch.schedule'),
    segments: t('sprintPlanner.swimlane.planPatch.segments'),
  });
  const tone = planPatchCaptionTone(preview);
  return (
    <TaskBarPendingApprovalToolbar
      clientBrand={preview.clientBrand}
      commentId={preview.taskId}
      extraAction={
        <DraftItemCommentButton
          sprintId={sprintId}
          targetId={preview.taskId}
          targetKind="position"
          targetLabel={`${preview.taskId} · ${label}`}
        />
      }
      label={label}
      labelClassName={tone.className}
      labelIcon={tone.icon}
      onApprove={(taskId) => {
        approve([taskId]).catch(() => undefined);
      }}
      onReject={(taskId) => {
        reject([taskId]).catch(() => undefined);
      }}
    />
  );
}
