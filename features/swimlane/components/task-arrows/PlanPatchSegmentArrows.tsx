'use client';

import { observer } from 'mobx-react-lite';

import { buildPlanPatchSegmentArrowLinks } from '@/features/swimlane/utils/task-arrows/planPatchSegmentArrowHelpers';
import { useRootStore } from '@/lib/layers';

import { TaskSegmentArrowLinks } from './TaskSegmentArrowLinks';

export const PlanPatchSegmentArrows = observer(function PlanPatchSegmentArrows({
  clipToAssigneeId = null,
}: {
  clipToAssigneeId?: string | null;
}) {
  const { taskPositions } = useRootStore();
  const links = buildPlanPatchSegmentArrowLinks(taskPositions.planPatchPreviews.values(), {
    assigneeId: clipToAssigneeId,
  });
  if (links.length === 0) {
    return null;
  }
  return <TaskSegmentArrowLinks links={links} tasksMap={new Map()} />;
});
