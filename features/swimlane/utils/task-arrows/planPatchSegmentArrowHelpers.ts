import type { SwimlaneSegmentArrowLink } from './swimlaneSegmentArrowHelpers';
import type { PlanPatchPositionPreview } from '@/lib/sprints/sprintPlanPatchPositionPreview';

import { planPatchPreviewSegmentHtmlAnchorId } from '@/features/swimlane/utils/planPatchPreviewFocus';

/** Пунктирные связи между отрезками ghost-превью plan patch (как у реальных multi-bar задач). */
export function buildPlanPatchSegmentArrowLinks(
  previews: Iterable<
    Pick<PlanPatchPositionPreview, 'assigneeId' | 'remove' | 'segments' | 'taskId'>
  >,
  options?: { assigneeId?: string | null }
): SwimlaneSegmentArrowLink[] {
  const links: SwimlaneSegmentArrowLink[] = [];
  const clipAssigneeId = options?.assigneeId ?? null;

  for (const preview of previews) {
    if (preview.remove) {
      continue;
    }
    if (clipAssigneeId != null && preview.assigneeId !== clipAssigneeId) {
      continue;
    }
    const segments = preview.segments;
    if (!segments || segments.length < 2) {
      continue;
    }
    for (let i = 0; i < segments.length - 1; i += 1) {
      const fromIndex = i;
      const toIndex = i + 1;
      links.push({
        endElement: planPatchPreviewSegmentHtmlAnchorId(preview.taskId, toIndex),
        id: `plan-patch-segment-${preview.taskId}-${fromIndex}-${toIndex}`,
        startElement: planPatchPreviewSegmentHtmlAnchorId(preview.taskId, fromIndex),
        taskId: preview.taskId,
      });
    }
  }

  return links;
}
